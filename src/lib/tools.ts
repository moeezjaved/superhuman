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
import { sendGmail, createGmailDraft, asEmailPayload } from './actions/gmail';

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

/**
 * Real executor: performs implemented actions for real (Gmail today), and falls
 * back to the stub's safe description for anything not yet wired. This is what
 * runs use in production — irreversible actions only reach here AFTER the
 * Approvals gate, so a real send is always a human-approved send.
 */
export class RealToolExecutor implements ToolExecutor {
  async execute(action: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      if (action === 'gmail.send_draft' || action === 'outlook.send_mail') {
        const email = asEmailPayload(input);
        if (!email) return stub(action, input); // no structured payload → don't send garbage; describe instead
        const r = await sendGmail(ctx.workspaceId, email);
        return { ok: true, diff: `SENT email to ${email.to} — “${email.subject}”`, output: r, costUsd: 0 };
      }
      if (action === 'gmail.create_draft') {
        const email = asEmailPayload(input);
        if (!email) return stub(action, input);
        const r = await createGmailDraft(ctx.workspaceId, email);
        return { ok: true, diff: `Drafted email to ${email.to} — “${email.subject}”`, output: r, costUsd: 0 };
      }
      // not yet implemented for real → safe simulated description (run still completes)
      return stub(action, input);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'action failed' };
    }
  }
}

function stub(action: string, input: unknown): ToolResult {
  const atomic = getAtomic(action);
  const label = atomic?.label ?? action;
  return { ok: true, diff: describeDiff(action, label, input), output: { simulated: true, action }, costUsd: 0 };
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
