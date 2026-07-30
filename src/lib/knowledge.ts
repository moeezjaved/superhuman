/**
 * Cortex — knowledge layer (dual-mode). Postgres+pgvector (pg) when DATABASE_URL set, else file.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { q, hasDb } from './db';

const EMB = openai.embedding('text-embedding-3-small');
const DATA_DIR = path.join(process.cwd(), '.data');
const KB_FILE = path.join(DATA_DIR, 'knowledge.json');

export interface Chunk { id: string; workspaceId: string; source: string; text: string; embedding: number[]; createdAt: string; }
export interface Hit { source: string; text: string; score: number; }

async function readKB(): Promise<Chunk[]> { try { return JSON.parse(await fs.readFile(KB_FILE, 'utf8')) as Chunk[]; } catch { return []; } }
async function writeKB(c: Chunk[]) { await fs.mkdir(DATA_DIR, { recursive: true }); await fs.writeFile(KB_FILE, JSON.stringify(c), 'utf8'); }
let _n = 0;
const cid = () => `chunk_${Date.now().toString(36)}${(_n++).toString(36)}`;
const vec = (e: number[]) => `[${e.join(',')}]`;

export function chunkText(text: string, max = 800): string[] {
  const paras = text.replace(/\r/g, '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const out: string[] = []; let buf = '';
  for (const p of paras) { if ((buf + '\n\n' + p).length > max && buf) { out.push(buf); buf = p; } else buf = buf ? buf + '\n\n' + p : p; }
  if (buf) out.push(buf);
  return out.flatMap(c => c.length <= max * 1.5 ? [c] : (c.match(new RegExp(`[\\s\\S]{1,${max}}`, 'g')) ?? [c]));
}

export async function ingestText(source: string, text: string, workspaceId = 'ws_demo'): Promise<number> {
  const pieces = chunkText(text).filter(p => p.length > 20);
  if (!pieces.length) return 0;
  const { embeddings } = await embedMany({ model: EMB, values: pieces });
  const now = new Date().toISOString();
  if (hasDb) {
    for (let i = 0; i < pieces.length; i++) {
      await q(`insert into knowledge_chunks (id, workspace_id, source, text, embedding, created_at) values ($1,$2,$3,$4,$5::vector,$6)`,
        [cid(), workspaceId, source, pieces[i], vec(embeddings[i]), now]);
    }
    return pieces.length;
  }
  const chunks: Chunk[] = pieces.map((t, i) => ({ id: cid(), workspaceId, source, text: t, embedding: embeddings[i], createdAt: now }));
  const kb = await readKB(); kb.push(...chunks); await writeKB(kb); return chunks.length;
}

export async function ingestUrl(url: string, workspaceId = 'ws_demo'): Promise<number> {
  const html = await (await fetch(url, { headers: { 'user-agent': 'CortexBot/0.1' } })).text();
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  return ingestText(url, text, workspaceId);
}

export async function retrieve(query: string, k = 5, workspaceId = 'ws_demo'): Promise<Hit[]> {
  const { embedding } = await embed({ model: EMB, value: query });
  if (hasDb) {
    const rows = await q<{ source: string; text: string; score: string }>(
      `select source, text, 1-(embedding <=> $1::vector) as score from knowledge_chunks where workspace_id=$2 order by embedding <=> $1::vector limit $3`,
      [vec(embedding), workspaceId, k]);
    return rows.map(r => ({ source: r.source, text: r.text, score: Number(r.score) }));
  }
  const kb = (await readKB()).filter(c => c.workspaceId === workspaceId);
  if (!kb.length) return [];
  return kb.map(c => ({ source: c.source, text: c.text, score: cosine(embedding, c.embedding) })).sort((a, b) => b.score - a.score).slice(0, k);
}

export async function listSources(workspaceId = 'ws_demo'): Promise<{ source: string; chunks: number }[]> {
  if (hasDb) {
    const rows = await q<{ source: string; chunks: number }>(`select source, count(*)::int as chunks from knowledge_chunks where workspace_id=$1 group by source`, [workspaceId]);
    return rows.map(r => ({ source: r.source, chunks: Number(r.chunks) }));
  }
  const kb = (await readKB()).filter(c => c.workspaceId === workspaceId);
  const m = new Map<string, number>(); for (const c of kb) m.set(c.source, (m.get(c.source) ?? 0) + 1);
  return [...m.entries()].map(([source, chunks]) => ({ source, chunks }));
}

function cosine(a: number[], b: number[]): number { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / (Math.sqrt(na) * Math.sqrt(nb) || 1); }
