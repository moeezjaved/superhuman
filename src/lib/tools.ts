/**
 * Cortex — Tool executor.
 * -----------------------------------------------------------------------------
 * The run engine calls tools through this interface. Real integrations (Gmail,
 * Stripe, Unipile, ...) implement `ToolExecutor` later; for now `StubToolExecutor`
 * pretends to do the work and returns a human-readable `diff` (exactly what would
 * change) so we can see a full run trace without side effects.
 *
 * Reads are ungated and implicit — the runtime agent's retrieval handles them.
 * Only WRITE actions (the capability ids) flow through here.
 */

import { getAtomic } from './capabilities';

export interface ToolContext {
  workspaceId: string;
  runId: string;
  idempotencyKey: string; // survives retries without double-sending
}

export interface ToolResult {
  ok: boolean;
  output?: unknown;
  diff?: string;   // "Drafted email to you (subject: 'Weekly Stripe summary')"
  error?: string;
  costUsd?: number;
}

export interface ToolExecutor {
  execute(action: string, input: unknown, ctx: ToolContext): Promise<ToolResult>;
}

/** No-side-effect executor: describes what WOULD happen. Perfect for local demos. */
export class StubToolExecutor implements ToolExecutor {
  async execute(action: string, input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const atomic = getAtomic(action);
    const label = atomic?.label ?? action;
    // a tiny bit of realism per action family
    const diff = describeDiff(action, label, input);
    return { ok: true, diff, output: { simulated: true, action }, costUsd: 0 };
  }
}

function describeDiff(action: string, label: string, input: unknown): string {
  const hint =
    typeof input === 'string' ? input : input ? JSON.stringify(input).slice(0, 80) : '';
  if (action.endsWith('create_draft')) return `Drafted an email${hint ? ` — ${hint}` : ''}`;
  if (action.endsWith('send_draft') || action.endsWith('send_mail'))
    return `SENT an email${hint ? ` — ${hint}` : ''}`;
  if (action.includes('send_invitation')) return `Sent a LinkedIn connection request`;
  if (action.includes('send_inmail')) return `Sent a LinkedIn InMail`;
  if (action.includes('whatsapp')) return `Sent a WhatsApp message`;
  if (action.includes('upload_file')) return `Uploaded a file`;
  if (action.includes('create_shared_link')) return `Created a shareable link`;
  if (action.includes('refund')) return `Issued a refund`;
  return `Performed: ${label}`;
}
