/**
 * Cortex — Nango integration layer.
 * Nango brokers OAuth + tokens for user tools (Gmail, Drive, Dropbox, Slack, Notion...).
 * Backend uses the secret key to (a) mint Connect sessions and (b) proxy API calls.
 */
import { Nango } from '@nangohq/node';

export const nango = process.env.NANGO_SECRET_KEY
  ? new Nango({ secretKey: process.env.NANGO_SECRET_KEY })
  : null;
export const NANGO_ENABLED = !!nango;

/** Providers we offer to connect (must match integration IDs created in Nango). */
export const CONNECTORS = [
  { id: 'google-mail', label: 'Gmail', kind: 'email' },
  { id: 'google-drive', label: 'Google Drive', kind: 'storage' },
  { id: 'dropbox', label: 'Dropbox', kind: 'storage' },
  { id: 'slack', label: 'Slack', kind: 'chat' },
  { id: 'notion', label: 'Notion', kind: 'docs' },
] as const;

/** Mint a Connect session for a workspace (the frontend opens Nango Connect with it). */
export async function createConnectSession(workspaceId: string, integrations?: string[]) {
  if (!nango) throw new Error('NANGO_SECRET_KEY not configured');
  const res = await nango.createConnectSession({
    end_user: { id: workspaceId },
    allowed_integrations: integrations && integrations.length ? integrations : undefined,
  });
  return res.data; // { token, expires_at }
}

/** Authenticated GET to a provider via Nango's proxy. */
export async function proxyGet<T = unknown>(providerConfigKey: string, connectionId: string, endpoint: string, params?: Record<string, string | number>): Promise<T> {
  if (!nango) throw new Error('NANGO_SECRET_KEY not configured');
  const res = await nango.get({ providerConfigKey, connectionId, endpoint, params });
  return res.data as T;
}
