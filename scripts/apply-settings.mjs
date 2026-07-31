import 'dotenv/config'; import pg from 'pg';
const u = new URL(process.env.DATABASE_URL);
const c = new pg.Client({ host:u.hostname, port:+u.port||6543, database:u.pathname.slice(1)||'postgres', user:decodeURIComponent(u.username), password:decodeURIComponent(u.password), ssl:{rejectUnauthorized:false} });
await c.connect();
await c.query(`create table if not exists settings (
  workspace_id text primary key,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);`);
const r = await c.query("select 1 from information_schema.tables where table_name='settings'");
console.log('settings table:', r.rowCount ? 'ready ✓' : 'MISSING');
await c.end();
