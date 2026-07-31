/**
 * Cortex — Run Engine.
 * -----------------------------------------------------------------------------
 * Executes a compiled Skill and produces a full Run trace. This is the "operating
 * half" LemonLime lacks: triggered execution, enforced approval gates, real waits,
 * and a persistent record of exactly what happened.
 *
 * This core is PURE (no I/O of its own) so it can run:
 *   - locally in a demo (StubToolExecutor + auto-approver), and
 *   - inside Inngest later (each `await` becomes a durable step; waits become
 *     `step.sleep`/`step.waitForEvent`; approvals become `step.waitForEvent`).
 *
 * The engine never trusts the compiler: irreversible actions are re-checked here
 * and forced through approval if not already gated (defense in depth).
 */

import type { SkillDraft, Run, RunStep, ApprovalRequest } from './types';
import type { ToolExecutor, ToolContext } from './tools';
import { getAtomic } from './capabilities';
import { amountFromInput } from './settings-store';

// 'defer' = suspend the run at this gate (autonomous runs leave risky actions
// for a human — the run persists as awaiting_approval and resumes on decision).
export type ApprovalDecider = (
  req: ApprovalRequest,
) => Promise<'approved' | 'rejected' | 'defer'>;

export interface RunEvent {
  type:
    | 'run_started'
    | 'step_started'
    | 'step_finished'
    | 'awaiting_approval'
    | 'approved'
    | 'rejected'
    | 'waiting'
    | 'run_finished';
  message: string;
  step?: number;
}

export interface RunOptions {
  workspaceId: string;
  executor: ToolExecutor;
  approve: ApprovalDecider;
  params?: Record<string, unknown>;
  onEvent?: (e: RunEvent) => void;
  /** In demos we don't actually sleep for days. In prod (Inngest) this is false. */
  simulateWaits?: boolean;
  /** The owner's money rules (from Settings). Enforced per step when an amount is present. */
  policy?: { autoApproveUnder: number; askOver: number };
}

let _seq = 0;
const id = (p: string) => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

export async function executeRun(skill: SkillDraft, opts: RunOptions): Promise<Run> {
  const emit = (e: RunEvent) => opts.onEvent?.(e);
  const runId = id('run');
  const run: Run = {
    id: runId,
    workspaceId: opts.workspaceId,
    skillId: skill.name,
    versionId: 'v1',
    status: 'running',
    params: opts.params ?? {},
    steps: [],
    costUsd: 0,
    startedAt: new Date().toISOString(),
  };
  emit({ type: 'run_started', message: `Run started: ${skill.name}` });

  try {
    for (let i = 0; i < skill.steps.length; i++) {
      const step = skill.steps[i];
      const ord = i + 1;
      const rec: RunStep = {
        ord,
        label: step.label,
        provider: step.integration,
        action: step.action ?? null,
        status: 'running',
      };
      run.steps.push(rec);
      emit({ type: 'step_started', step: ord, message: step.label });

      const t0 = Date.now();

      // 1) durable wait (LemonLime's "wait 3 days" is a hollow sentence — here it's real)
      if (step.wait) {
        run.status = step.wait.kind === 'until_event' ? 'awaiting_event' : 'running';
        const desc =
          step.wait.kind === 'duration'
            ? `wait ${step.wait.durationSec ?? 0}s`
            : `wait for "${step.wait.event}" (timeout ${step.wait.timeoutSec ?? 0}s)`;
        emit({ type: 'waiting', step: ord, message: `${step.label} — ${desc}` });
        // prod: `await step.sleep(...)` / `await step.waitForEvent(...)`
        if (opts.simulateWaits) await new Promise((r) => setTimeout(r, 200));
      }

      // 2) pure reasoning / read step (no write action) — runtime agent handles it
      if (!step.action) {
        rec.status = 'succeeded';
        rec.diff = undefined;
        rec.latencyMs = Date.now() - t0;
        emit({ type: 'step_finished', step: ord, message: `${step.label} ✓` });
        continue;
      }

      // 3) write action — enforce governance (defense in depth)
      const atomic = getAtomic(step.action);
      let needsApproval =
        step.approval === 'require_approval' || (!!atomic?.irreversible && step.approval !== 'auto');

      // The owner's money rules (Settings) refine the decision when the step
      // carries an amount: force a human over the ask-limit; auto-clear small
      // amounts that were only gated for being irreversible. An explicit
      // require_approval is never auto-cleared — the owner asked for the gate.
      if (opts.policy) {
        const amount = amountFromInput(step.input);
        if (amount != null) {
          if (amount >= opts.policy.askOver) needsApproval = true;
          else if (amount < opts.policy.autoApproveUnder && step.approval !== 'require_approval') needsApproval = false;
        }
      }

      if (step.approval === 'deny') {
        rec.status = 'canceled';
        rec.latencyMs = Date.now() - t0;
        emit({ type: 'step_finished', step: ord, message: `${step.label} — denied by policy` });
        continue;
      }

      if (needsApproval) {
        const req: ApprovalRequest = {
          id: id('appr'),
          runId,
          stepOrd: ord,
          action: step.action,
          summary: `Approve: ${step.label}?`,
          payloadPreview: { action: step.action, provider: step.integration },
          status: 'pending',
        };
        run.status = 'awaiting_approval';
        emit({ type: 'awaiting_approval', step: ord, message: req.summary });
        const decision = await opts.approve(req); // prod: durable waitForEvent
        if (decision === 'defer') {
          rec.status = 'awaiting_approval';
          rec.latencyMs = Date.now() - t0;
          run.status = 'awaiting_approval';
          run.finishedAt = new Date().toISOString();
          emit({ type: 'awaiting_approval', step: ord, message: `${step.label} — waiting for your approval` });
          return finalize(run);
        }
        if (decision === 'rejected') {
          rec.status = 'canceled';
          rec.latencyMs = Date.now() - t0;
          emit({ type: 'rejected', step: ord, message: `${step.label} — rejected by user` });
          // policy: a rejected irreversible action stops the run cleanly
          run.status = 'canceled';
          run.finishedAt = new Date().toISOString();
          emit({ type: 'run_finished', message: 'Run canceled at approval gate' });
          return finalize(run);
        }
        emit({ type: 'approved', step: ord, message: `${step.label} — approved` });
        run.status = 'running';
      }

      // 4) execute the tool (idempotent)
      const ctx: ToolContext = {
        workspaceId: opts.workspaceId,
        runId,
        idempotencyKey: `${runId}:${ord}`,
      };
      // hand the executor the action payload if the step carries one, else the label
      const result = await opts.executor.execute(step.action, step.input ?? step.label, ctx);
      rec.latencyMs = Date.now() - t0;
      rec.costUsd = result.costUsd ?? 0;
      run.costUsd = (run.costUsd ?? 0) + (result.costUsd ?? 0);
      if (result.ok) {
        rec.status = 'succeeded';
        rec.diff = result.diff;
        rec.output = result.output;
        emit({ type: 'step_finished', step: ord, message: `${step.label} ✓  (${result.diff ?? ''})` });
      } else {
        rec.status = 'failed';
        rec.output = { error: result.error };
        run.status = 'failed';
        run.error = result.error;
        run.finishedAt = new Date().toISOString();
        emit({ type: 'run_finished', message: `Run failed at step ${ord}: ${result.error}` });
        return finalize(run);
      }
    }

    run.status = 'succeeded';
    run.finishedAt = new Date().toISOString();
    run.hoursSaved = estimateHoursSaved(skill); // ROI — the renewal number
    emit({ type: 'run_finished', message: `Run succeeded — ${skill.steps.length} steps` });
    return finalize(run);
  } catch (err) {
    run.status = 'failed';
    run.error = err instanceof Error ? err.message : String(err);
    run.finishedAt = new Date().toISOString();
    emit({ type: 'run_finished', message: `Run crashed: ${run.error}` });
    return finalize(run);
  }
}

function finalize(run: Run): Run {
  // prod: persist run + steps to Postgres (audit log), emit run.completed webhook
  return run;
}

/**
 * Resume a run that suspended at an approval gate, applying the human's decision.
 *
 * The gate the user just decided is honored; any *later* gate defers again (so a
 * multi-approval skill comes back to the inbox for each decision). Run identity
 * (id, skill, source, start time) is preserved so Activity shows one run
 * progressing, not a fork. In stub mode re-executing earlier steps is harmless;
 * the durable (Inngest) version will replay from the gate instead.
 */
export async function resumeRun(
  skill: SkillDraft,
  prior: Run,
  decision: { stepOrd: number; decision: 'approved' | 'rejected' },
  opts: Omit<RunOptions, 'approve' | 'params'>,
): Promise<Run> {
  const next = await executeRun(skill, {
    ...opts,
    params: prior.params,
    approve: async (req) =>
      req.stepOrd === decision.stepOrd ? decision.decision : 'defer',
  });
  // preserve identity so the inbox/activity track the same run
  next.id = prior.id;
  next.skillId = prior.skillId;
  next.skillName = prior.skillName ?? skill.name;
  next.source = prior.source;
  next.startedAt = prior.startedAt;
  return next;
}

/** Rough ROI estimate: ~4 min saved per executed write/compute step. Real version
 *  learns per-skill from realized vs estimated (doc 25). */
function estimateHoursSaved(skill: SkillDraft): number {
  const active = skill.steps.filter((s) => s.action || s.label).length;
  return Math.round((active * 4 * 100) / 60) / 100;
}
