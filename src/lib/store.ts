/**
 * Cortex — persistence (dual-mode). Postgres (pg) when DATABASE_URL set, else file.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SkillDraft, Run } from './types';
import { q, hasDb } from './db';

export interface SavedSkill extends SkillDraft { id: string; workspaceId: string; createdAt: string; enabled: boolean; }
interface DB { skills: SavedSkill[]; runs: Run[]; }

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
async function rf(): Promise<DB> { try { return JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as DB; } catch { return { skills: [], runs: [] }; } }
async function wf(db: DB) { await fs.mkdir(DATA_DIR, { recursive: true }); await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }
let _n = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}${(_n++).toString(36)}`;

export const store = {
  async saveSkill(skill: SkillDraft, workspaceId = 'ws_demo'): Promise<SavedSkill> {
    const saved: SavedSkill = { ...skill, id: newId('skill'), workspaceId, createdAt: new Date().toISOString(), enabled: true };
    if (hasDb) {
      await q(`insert into skills (id, workspace_id, name, spec, trigger, enabled, created_at) values ($1,$2,$3,$4,$5,$6,$7)`,
        [saved.id, workspaceId, saved.name, JSON.stringify(saved), JSON.stringify(saved.trigger), saved.enabled, saved.createdAt]);
    } else { const db = await rf(); db.skills.push(saved); await wf(db); }
    return saved;
  },
  async listSkills(workspaceId = 'ws_demo'): Promise<SavedSkill[]> {
    if (hasDb) { const rows = await q<{ spec: SavedSkill }>(`select spec from skills where workspace_id=$1 order by created_at desc`, [workspaceId]); return rows.map(r => r.spec); }
    const db = await rf(); return db.skills.filter(s => s.workspaceId === workspaceId).reverse();
  },
  async getSkill(id: string): Promise<SavedSkill | undefined> {
    if (hasDb) { const rows = await q<{ spec: SavedSkill }>(`select spec from skills where id=$1 limit 1`, [id]); return rows[0]?.spec; }
    const db = await rf(); return db.skills.find(s => s.id === id);
  },
  async scheduledSkills(): Promise<SavedSkill[]> {
    if (hasDb) { const rows = await q<{ spec: SavedSkill }>(`select spec from skills where enabled=true and trigger->>'type'='schedule'`); return rows.map(r => r.spec); }
    const db = await rf(); return db.skills.filter(s => s.enabled && s.trigger.type === 'schedule');
  },
  async saveRun(run: Run): Promise<void> {
    if (hasDb) {
      await q(`insert into runs (id, workspace_id, skill_id, status, started_at, data) values ($1,$2,$3,$4,$5,$6)
               on conflict (id) do update set status=excluded.status, data=excluded.data`,
        [run.id, run.workspaceId, run.skillId, run.status, run.startedAt ?? null, JSON.stringify(run)]);
      return;
    }
    const db = await rf(); const i = db.runs.findIndex(r => r.id === run.id); if (i >= 0) db.runs[i] = run; else db.runs.push(run); await wf(db);
  },
  async getRun(id: string): Promise<Run | undefined> {
    if (hasDb) { const rows = await q<{ data: Run }>(`select data from runs where id=$1 limit 1`, [id]); return rows[0]?.data; }
    const db = await rf(); return db.runs.find(r => r.id === id);
  },
  async listRuns(workspaceId = 'ws_demo', limit = 100): Promise<Run[]> {
    if (hasDb) { const rows = await q<{ data: Run }>(`select data from runs where workspace_id=$1 order by started_at desc nulls last limit $2`, [workspaceId, limit]); return rows.map(r => r.data); }
    const db = await rf(); return db.runs.filter(r => r.workspaceId === workspaceId).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '')).slice(0, limit);
  },
};
