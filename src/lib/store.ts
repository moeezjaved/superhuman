/**
 * Cortex — persistence (dual-mode).
 * Postgres/Supabase when DATABASE_URL is set (required on Vercel), else a local
 * JSON file for zero-setup dev. Interface is identical either way.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SkillDraft, Run } from './types';
import { sql, hasDb } from './db';

export interface SavedSkill extends SkillDraft {
  id: string; workspaceId: string; createdAt: string; enabled: boolean;
}
interface DB { skills: SavedSkill[]; runs: Run[]; }

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
async function readFile(): Promise<DB> {
  try { return JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as DB; } catch { return { skills: [], runs: [] }; }
}
async function writeFile(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}
let _n = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}${(_n++).toString(36)}`;

export const store = {
  async saveSkill(skill: SkillDraft, workspaceId = 'ws_demo'): Promise<SavedSkill> {
    const saved: SavedSkill = { ...skill, id: newId('skill'), workspaceId, createdAt: new Date().toISOString(), enabled: true };
    if (hasDb && sql) {
      await sql`insert into skills (id, workspace_id, name, spec, trigger, enabled, created_at)
        values (${saved.id}, ${workspaceId}, ${saved.name}, ${sql.json(saved as never)}, ${sql.json(saved.trigger as never)}, ${saved.enabled}, ${saved.createdAt})`;
    } else {
      const db = await readFile(); db.skills.push(saved); await writeFile(db);
    }
    return saved;
  },

  async listSkills(workspaceId = 'ws_demo'): Promise<SavedSkill[]> {
    if (hasDb && sql) {
      const rows = await sql`select spec from skills where workspace_id = ${workspaceId} order by created_at desc`;
      return rows.map((r) => r.spec as SavedSkill);
    }
    const db = await readFile();
    return db.skills.filter((s) => s.workspaceId === workspaceId).reverse();
  },

  async getSkill(id: string): Promise<SavedSkill | undefined> {
    if (hasDb && sql) {
      const rows = await sql`select spec from skills where id = ${id} limit 1`;
      return rows[0]?.spec as SavedSkill | undefined;
    }
    const db = await readFile();
    return db.skills.find((s) => s.id === id);
  },

  async scheduledSkills(): Promise<SavedSkill[]> {
    if (hasDb && sql) {
      const rows = await sql`select spec from skills where enabled = true and trigger->>'type' = 'schedule'`;
      return rows.map((r) => r.spec as SavedSkill);
    }
    const db = await readFile();
    return db.skills.filter((s) => s.enabled && s.trigger.type === 'schedule');
  },

  async saveRun(run: Run): Promise<void> {
    if (hasDb && sql) {
      await sql`insert into runs (id, workspace_id, skill_id, status, started_at, data)
        values (${run.id}, ${run.workspaceId}, ${run.skillId}, ${run.status}, ${run.startedAt ?? null}, ${sql.json(run as never)})
        on conflict (id) do update set status = excluded.status, data = excluded.data`;
      return;
    }
    const db = await readFile();
    const i = db.runs.findIndex((r) => r.id === run.id);
    if (i >= 0) db.runs[i] = run; else db.runs.push(run);
    await writeFile(db);
  },

  async listRuns(workspaceId = 'ws_demo', limit = 100): Promise<Run[]> {
    if (hasDb && sql) {
      const rows = await sql`select data from runs where workspace_id = ${workspaceId} order by started_at desc nulls last limit ${limit}`;
      return rows.map((r) => r.data as Run);
    }
    const db = await readFile();
    return db.runs.filter((r) => r.workspaceId === workspaceId)
      .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '')).slice(0, limit);
  },
};
