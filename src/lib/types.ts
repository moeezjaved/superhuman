/**
 * Cortex core types — the Skill (automation) model.
 * -----------------------------------------------------------------------------
 * Derived from LemonLime's leaked draft schema (doc 29) + the operating half it
 * lacks (triggers, waits, approvals, runs — docs 22/24). LemonLime's automation
 * is just {name, description, hot_section, cold_section, steps[], category}.
 * We KEEP that (hot_section = the SOP prose the runtime follows) and ADD the
 * deterministic scaffolding a durable engine can execute: trigger, params,
 * per-step action binding + approval + wait.
 */

import { z } from 'zod';

export type Category = 'sales' | 'marketing' | 'operations' | 'support';
export type Visibility = 'private' | 'public'; // public = shared with workspace

/* ------------------------------ Triggers ---------------------------------- */
/* The #1 thing LemonLime has none of. The compiler already infers cadence from
   phrasing ("every Monday 8am") — we turn that into a real trigger object.     */
export const TriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('manual') }),
  z.object({ type: z.literal('schedule'), cron: z.string(), tz: z.string() }),
  z.object({ type: z.literal('inbound_email'), address: z.string() }),
  z.object({ type: z.literal('webhook'), token: z.string() }),
  z.object({
    type: z.literal('event'),
    provider: z.string(), // e.g. 'stripe'
    event: z.string(),    // e.g. 'payment_intent.failed'
    filter: z.record(z.string(), z.unknown()).optional(),
  }),
]);
export type Trigger = z.infer<typeof TriggerSchema>;

/* -------------------------------- Steps ----------------------------------- */
/* LemonLime steps are display-only {label, integration}. We keep the label +
   integration for the preview, and ADD executable metadata the runtime uses.   */
export const StepSchema = z.object({
  label: z.string().max(500),
  integration: z.string().nullable(), // provider slug or null (compute/ask step)
  // executable extensions (optional — a pure-reasoning step needs none):
  action: z.string().nullable().optional(),        // capability id, MUST exist in registry
  approval: z.enum(['auto', 'require_approval', 'deny']).optional(),
  wait: z
    .object({
      // real, durable waits (LemonLime's "wait 3 days" is a hollow sentence)
      kind: z.enum(['duration', 'until_event']),
      durationSec: z.number().optional(),
      event: z.string().optional(),   // e.g. 'reply_received'
      timeoutSec: z.number().optional(),
    })
    .optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const ParamSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'entity']),
  required: z.boolean().default(false),
  description: z.string().optional(),
});
export type Param = z.infer<typeof ParamSchema>;

/* ------------------------------- The Skill -------------------------------- */
/* This is the compiler's output (analogous to LemonLime's `update_draft`).
   hot_section = the runtime SOP; steps[] = display + execution scaffolding.     */
export const SkillDraftSchema = z.object({
  name: z.string().max(400),
  description: z.string().max(4000),
  category: z.enum(['sales', 'marketing', 'operations', 'support']).nullable(),
  // The executable instruction document the runtime agent follows every run:
  hot_section: z.string().max(40000),
  // Overflow: edge cases / escalation kept out of the main flow:
  cold_section: z.string().max(40000).optional(),
  steps: z.array(StepSchema).max(40),
  // OUR additions (the operating half):
  trigger: TriggerSchema.default({ type: 'manual' }),
  params: z.array(ParamSchema).default([]),
  // Prerequisite report the compiler produces against the capability registry:
  prerequisites: z
    .array(
      z.object({
        provider: z.string(),
        status: z.enum(['connected', 'supported_not_connected', 'unsupported']),
      }),
    )
    .default([]),
});
export type SkillDraft = z.infer<typeof SkillDraftSchema>;

/* -------------------------------- Runs ------------------------------------ */
/* The observability LemonLime has none of (only a live tracker, no history).   */
export type RunStatus =
  | 'queued'
  | 'running'
  | 'awaiting_approval'
  | 'awaiting_event'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface RunStep {
  ord: number;
  label: string;
  provider: string | null;
  action: string | null;
  input?: unknown;
  output?: unknown;
  diff?: string; // exactly what changed (emails drafted, files created, links shared)
  status: RunStatus;
  costUsd?: number;
  latencyMs?: number;
}

export interface Run {
  id: string;
  workspaceId: string;
  skillId: string;
  skillName?: string;
  source?: 'schedule' | 'event' | 'webhook' | 'manual';
  versionId: string;
  triggerId?: string;
  chatId?: string;
  status: RunStatus;
  params: Record<string, unknown>;
  steps: RunStep[];
  costUsd?: number;
  hoursSaved?: number; // ROI (doc 25) — the renewal number
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

/* --------------------------- Approval requests ---------------------------- */
/* Rendered as the elicitation/confirmation card (LemonLime's "QUESTION" card,
   doc 27 Test 8b) — but here it's a real gate that suspends the durable run.    */
export interface ApprovalRequest {
  id: string;
  runId: string;
  stepOrd: number;
  action: string;        // capability id
  summary: string;       // "Save 8 documents to your Dropbox?"
  items?: { id: string; label: string; removable: boolean }[]; // per-item curation
  payloadPreview: unknown;
  status: 'pending' | 'approved' | 'rejected';
  decidedBy?: string;
  decidedAt?: string;
}
