/**
 * Cortex — ingest layer.
 * -----------------------------------------------------------------------------
 * Pulls REAL data from a connected tool (via the Nango proxy) and feeds it into
 * the knowledge layer (chunk → embed → pgvector). After this runs, /chat and
 * /discover answer from the user's own company data, not generic guesses.
 *
 * This is the difference vs LemonLime: they draft generic text; we ground every
 * answer in what your team actually said / wrote.
 */
import { proxyGet } from './nango';
import { ingestText } from './knowledge';
import { listConnections } from './connections-store';

export interface IngestResult { provider: string; sources: number; chunks: number; detail: string[]; }

/** connectionId Nango issued for this workspace+provider (or throw a clear error). */
async function connectionFor(workspaceId: string, provider: string): Promise<string> {
  const conns = await listConnections(workspaceId);
  const c = conns.find((x) => x.provider === provider);
  if (!c) throw new Error(`No ${provider} connection for this workspace. Connect it first.`);
  return c.connectionId;
}

// ---- Slack -----------------------------------------------------------------
interface SlackChannel { id: string; name: string; is_member?: boolean; num_members?: number; }
interface SlackUser { id: string; real_name?: string; name?: string; }
interface SlackMsg { type: string; subtype?: string; user?: string; text?: string; ts?: string; bot_id?: string; }

/** Read a Slack workspace: channels → recent messages → readable transcript per channel. */
async function ingestSlack(workspaceId: string, connectionId: string, opts: { channelLimit: number; msgsPerChannel: number }): Promise<IngestResult> {
  const detail: string[] = [];
  // 1) who's who (map user ids → names so transcripts read naturally)
  const names = new Map<string, string>();
  try {
    const u = await proxyGet<{ members?: SlackUser[] }>('slack', connectionId, '/users.list', { limit: 200 });
    for (const m of u.members ?? []) names.set(m.id, m.real_name || m.name || m.id);
  } catch { /* users:read may be missing — fall back to raw ids */ }

  // 2) list public channels
  const cl = await proxyGet<{ channels?: SlackChannel[]; error?: string }>('slack', connectionId, '/conversations.list', { types: 'public_channel', limit: 200, exclude_archived: 'true' });
  if (cl.error) throw new Error(`Slack: ${cl.error} (the app likely needs channels:read + channels:history scopes)`);
  const channels = (cl.channels ?? []).filter((c) => c.is_member).slice(0, opts.channelLimit);
  if (!channels.length) {
    const names = (cl.channels ?? []).slice(0, 5).map((c) => `#${c.name}`).join(', ') || '(no channels)';
    throw new Error(`Slack is connected and I can see your channels (${names}), but the app isn't a member of any yet — Slack blocks reading messages until it's invited. In Slack, open a channel and type: /invite @NangoDevelopersOnlyNotForProduction  then click "Learn from this" again.`);
  }

  let sources = 0, chunks = 0;
  for (const ch of channels) {
    try {
      const h = await proxyGet<{ messages?: SlackMsg[]; error?: string }>('slack', connectionId, '/conversations.history', { channel: ch.id, limit: opts.msgsPerChannel });
      if (h.error) { detail.push(`#${ch.name}: skipped (${h.error})`); continue; }
      const lines = (h.messages ?? [])
        .filter((m) => m.text && !m.subtype && !m.bot_id)
        .reverse() // oldest → newest reads like a conversation
        .map((m) => `${names.get(m.user ?? '') || m.user || 'someone'}: ${cleanSlack(m.text!, names)}`)
        .filter((l) => l.length > 4);
      if (!lines.length) { detail.push(`#${ch.name}: no readable messages`); continue; }
      const transcript = `Slack channel #${ch.name} — recent conversation:\n\n${lines.join('\n')}`;
      const n = await ingestText(`slack:#${ch.name}`, transcript, workspaceId);
      sources++; chunks += n;
      detail.push(`#${ch.name}: ${lines.length} messages → ${n} chunks`);
    } catch (e) {
      detail.push(`#${ch.name}: error ${e instanceof Error ? e.message : e}`);
    }
  }
  return { provider: 'slack', sources, chunks, detail };
}

/** Replace <@U123> mentions with names and strip Slack link markup. */
function cleanSlack(text: string, names: Map<string, string>): string {
  return text
    .replace(/<@([A-Z0-9]+)>/g, (_, id) => '@' + (names.get(id) || id))
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2 ($1)')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .trim();
}

// ---- Notion ----------------------------------------------------------------
interface NotionSearchResult { results?: Array<{ id: string; object: string; properties?: Record<string, unknown>; url?: string }>; }
interface NotionBlocks { results?: Array<{ type: string; [k: string]: unknown }>; }

/** Read Notion: search shared pages → pull each page's text blocks. */
async function ingestNotion(workspaceId: string, connectionId: string, opts: { pageLimit: number }): Promise<IngestResult> {
  const detail: string[] = [];
  // Notion search is POST; Nango proxy get only does GET, so we use the node client's post via proxyGet-style is not enough.
  // conversations differ: use the search endpoint via a POST proxy.
  const search = await proxyPost<NotionSearchResult>('notion', connectionId, '/v1/search', { page_size: opts.pageLimit, filter: { property: 'object', value: 'page' } });
  const pages = (search.results ?? []).filter((r) => r.object === 'page').slice(0, opts.pageLimit);
  if (!pages.length) throw new Error('Notion connected, but no pages are shared with the integration. In Notion, share a page/database with the connection, then re-run.');

  let sources = 0, chunks = 0;
  for (const p of pages) {
    try {
      const title = notionTitle(p.properties) || 'Untitled';
      const blocks = await proxyGet<NotionBlocks>('notion', connectionId, `/v1/blocks/${p.id}/children`, { page_size: 100 });
      const text = (blocks.results ?? []).map(notionBlockText).filter(Boolean).join('\n');
      if (!text.trim()) { detail.push(`${title}: empty`); continue; }
      const n = await ingestText(`notion:${title}`, `Notion page "${title}":\n\n${text}`, workspaceId);
      sources++; chunks += n;
      detail.push(`${title}: ${n} chunks`);
    } catch (e) {
      detail.push(`page ${p.id}: error ${e instanceof Error ? e.message : e}`);
    }
  }
  return { provider: 'notion', sources, chunks, detail };
}

function notionTitle(props?: Record<string, unknown>): string | null {
  if (!props) return null;
  for (const v of Object.values(props)) {
    const t = (v as { type?: string; title?: Array<{ plain_text?: string }> });
    if (t?.type === 'title' && Array.isArray(t.title)) return t.title.map((x) => x.plain_text || '').join('');
  }
  return null;
}
function notionBlockText(b: { type: string; [k: string]: unknown }): string {
  const rich = (b[b.type] as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text;
  return Array.isArray(rich) ? rich.map((r) => r.plain_text || '').join('') : '';
}

/** Authenticated POST via Nango proxy (Notion search needs POST). */
async function proxyPost<T>(providerConfigKey: string, connectionId: string, endpoint: string, data: unknown): Promise<T> {
  const { nango } = await import('./nango');
  if (!nango) throw new Error('NANGO_SECRET_KEY not configured');
  const res = await nango.post({ providerConfigKey, connectionId, endpoint, data });
  return res.data as T;
}

// ---- entry -----------------------------------------------------------------
export async function ingestProvider(workspaceId: string, provider: string): Promise<IngestResult> {
  const connectionId = await connectionFor(workspaceId, provider);
  if (provider === 'slack') return ingestSlack(workspaceId, connectionId, { channelLimit: 20, msgsPerChannel: 100 });
  if (provider === 'notion') return ingestNotion(workspaceId, connectionId, { pageLimit: 25 });
  throw new Error(`Ingest not yet supported for "${provider}". Slack and Notion are live.`);
}
