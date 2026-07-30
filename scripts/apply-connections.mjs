import 'dotenv/config'; import pg from 'pg';
const u = new URL(process.env.DATABASE_URL);
const c = new pg.Client({ host:u.hostname, port:+u.port||6543, database:u.pathname.slice(1)||'postgres', user:decodeURIComponent(u.username), password:decodeURIComponent(u.password), ssl:{rejectUnauthorized:false} });
await c.connect();
await c.query(`create table if not exists connections (id text primary key, workspace_id text not null, provider text not null, connection_id text not null, created_at timestamptz not null default now(), unique (workspace_id, provider)); create index if not exists conn_ws on connections(workspace_id);`);
const t = await c.query("select 1 from information_schema.tables where table_name='connections'");
console.log('connections table:', t.rowCount ? 'ready ✓' : 'MISSING');
await c.end();
