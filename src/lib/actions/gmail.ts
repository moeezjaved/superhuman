/**
 * Cortex — real Gmail actions (via Nango proxy).
 * -----------------------------------------------------------------------------
 * This is the moment runs stop pretending. `gmail.send_draft` here actually puts
 * an email in the outside world — which is exactly why it's an irreversible
 * capability that the Approvals inbox gates before it ever reaches this code.
 *
 * Auth: brokered by Nango (google-mail integration). We never see the token.
 * Scope needed on the Google app: gmail.send (compose) — same scope Lindy asks
 * for ("Read, compose, and send emails").
 */
import { nango } from '../nango';
import { listConnections } from '../connections-store';

export interface EmailPayload { to: string; subject: string; body: string; cc?: string }

/** connectionId for this workspace's Gmail (or a clear, actionable error). */
async function gmailConnection(workspaceId: string): Promise<string> {
  const conns = await listConnections(workspaceId);
  const c = conns.find((x) => x.provider === 'google-mail' || x.provider === 'gmail');
  if (!c) throw new Error('Gmail is not connected. Go to Connections → Connect Gmail (with send permission), then try again.');
  return c.connectionId;
}

function base64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Build an RFC-2822 message and base64url-encode it for the Gmail API. */
export function buildRawEmail(p: EmailPayload): string {
  const headers = [
    `To: ${p.to}`,
    p.cc ? `Cc: ${p.cc}` : null,
    `Subject: ${p.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ].filter(Boolean).join('\r\n');
  return base64Url(`${headers}\r\n\r\n${p.body}`);
}

/** ACTUALLY send an email from the user's Gmail. Irreversible — must be approved first. */
export async function sendGmail(workspaceId: string, p: EmailPayload): Promise<{ id: string; threadId: string }> {
  if (!nango) throw new Error('NANGO_SECRET_KEY not configured');
  const connectionId = await gmailConnection(workspaceId);
  const res = await nango.post({
    providerConfigKey: 'google-mail',
    connectionId,
    endpoint: '/gmail/v1/users/me/messages/send',
    data: { raw: buildRawEmail(p) },
  });
  return res.data as { id: string; threadId: string };
}

/** Create a Gmail DRAFT (reversible) — safe, no approval needed. */
export async function createGmailDraft(workspaceId: string, p: EmailPayload): Promise<{ id: string }> {
  if (!nango) throw new Error('NANGO_SECRET_KEY not configured');
  const connectionId = await gmailConnection(workspaceId);
  const res = await nango.post({
    providerConfigKey: 'google-mail',
    connectionId,
    endpoint: '/gmail/v1/users/me/drafts',
    data: { message: { raw: buildRawEmail(p) } },
  });
  return res.data as { id: string };
}

/** Read the payload the run engine hands the executor (step.input) as an email. */
export function asEmailPayload(input: unknown): EmailPayload | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  if (typeof o.to === 'string' && typeof o.subject === 'string' && typeof o.body === 'string') {
    return { to: o.to, subject: o.subject, body: o.body, cc: typeof o.cc === 'string' ? o.cc : undefined };
  }
  return null;
}
