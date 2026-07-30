/**
 * Postgres client (Supabase) via node-postgres (`pg`) — compatible with Node 25+.
 * Present only when DATABASE_URL is set; otherwise the app uses the file store.
 */
import pg from 'pg';

const url = process.env.DATABASE_URL;
export const hasDb = !!url;

let pool: pg.Pool | null = null;
if (url) {
  const u = new URL(url);
  pool = new pg.Pool({
    host: u.hostname,
    port: Number(u.port || 6543),
    database: u.pathname.slice(1) || 'postgres',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!pool) throw new Error('DATABASE_URL not configured');
  const r = await pool.query(text, params as never[]);
  return r.rows as T[];
}
