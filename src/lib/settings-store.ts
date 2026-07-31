import { q, hasDb } from './db';

/** Plain-English safety rules the owner sets; the run engine enforces them. */
export interface WorkspaceSettings {
  autoApproveUnder: number; // auto-say-yes to money actions below this ($)
  askOver: number;          // always ask a human above this ($)
}
export const DEFAULT_SETTINGS: WorkspaceSettings = { autoApproveUnder: 50, askOver: 500 };

export async function getSettings(workspaceId: string): Promise<WorkspaceSettings> {
  if (!hasDb) return DEFAULT_SETTINGS;
  const rows = await q<{ data: Partial<WorkspaceSettings> }>(
    `select data from settings where workspace_id=$1 limit 1`, [workspaceId]);
  return { ...DEFAULT_SETTINGS, ...(rows[0]?.data ?? {}) };
}

export async function saveSettings(workspaceId: string, s: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  const next = { ...(await getSettings(workspaceId)), ...clean(s) };
  if (hasDb) {
    await q(`insert into settings (workspace_id, data, updated_at) values ($1,$2,now())
             on conflict (workspace_id) do update set data=excluded.data, updated_at=now()`,
      [workspaceId, JSON.stringify(next)]);
  }
  return next;
}

function clean(s: Partial<WorkspaceSettings>): Partial<WorkspaceSettings> {
  const out: Partial<WorkspaceSettings> = {};
  if (typeof s.autoApproveUnder === 'number' && s.autoApproveUnder >= 0) out.autoApproveUnder = Math.round(s.autoApproveUnder);
  if (typeof s.askOver === 'number' && s.askOver >= 0) out.askOver = Math.round(s.askOver);
  return out;
}

/** Pull a money amount out of a step's action payload, if there is one. */
export function amountFromInput(input: unknown): number | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  for (const k of ['amount', 'total', 'value', 'price', 'refund', 'amountUsd']) {
    const v = o[k];
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string') { const n = Number(v.replace(/[^0-9.]/g, '')); if (isFinite(n) && v.trim()) return n; }
  }
  return null;
}
