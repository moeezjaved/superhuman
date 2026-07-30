/**
 * Cortex — durable functions (Inngest).
 * -----------------------------------------------------------------------------
 * This is the "it fires on its own" engine:
 *   - `dispatcher`  runs every minute, finds scheduled skills that are due, and
 *                   fires a run event. THIS is what LemonLime has none of.
 *   - `runSkill`    executes a skill through the run engine and persists the run.
 *                   Autonomous runs `defer` at approval gates (safe work happens,
 *                   risky actions wait for a human).
 *
 * Waits/approvals map to Inngest primitives in production (step.sleep /
 * step.waitForEvent); this first pass records them and completes fast.
 */

import { inngest, EVENTS } from './client';
import { store } from '../lib/store';
import { executeRun } from '../lib/run-engine';
import { StubToolExecutor } from '../lib/tools';
import { cronMatches } from '../lib/cron';

/** Fires scheduled skills automatically. Runs every minute. */
export const dispatcher = inngest.createFunction(
  { id: 'schedule-dispatcher', triggers: [{ cron: '* * * * *' }] },
  async ({ step }) => {
    const now = new Date();
    const due = await step.run('find-due', async () => {
      const scheduled = await store.scheduledSkills();
      return scheduled
        .filter((s) => s.trigger.type === 'schedule' && cronMatches(s.trigger.cron, now))
        .map((s) => ({ id: s.id, name: s.name }));
    });

    for (const s of due) {
      await step.sendEvent(`dispatch-${s.id}`, {
        name: EVENTS.RUN_REQUESTED,
        data: { skillId: s.id, source: 'schedule' },
      });
    }
    return { firedAt: now.toISOString(), count: due.length, skills: due };
  },
);

/** Executes one skill and records the run. */
export const runSkill = inngest.createFunction(
  { id: 'run-skill', concurrency: 8, triggers: [{ event: EVENTS.RUN_REQUESTED }] },
  async ({ event, step }) => {
    const { skillId, source } = event.data as {
      skillId: string;
      source?: 'schedule' | 'manual' | 'event';
    };

    const skill = await step.run('load-skill', () => store.getSkill(skillId));
    if (!skill) return { error: 'skill not found', skillId };

    const run = await executeRun(skill, {
      workspaceId: skill.workspaceId,
      executor: new StubToolExecutor(),
      // autonomous: do the safe work, DEFER risky (require_approval) actions to a human
      approve: async () => 'defer',
      simulateWaits: false,
    });

    run.skillId = skill.id;
    run.skillName = skill.name;
    run.source = source ?? 'manual';

    await step.run('persist-run', () => store.saveRun(run));
    return { runId: run.id, status: run.status, skill: skill.name };
  },
);

export const functions = [dispatcher, runSkill];
