import 'dotenv/config'; import pg from 'pg';
const u = new URL(process.env.DATABASE_URL);
const c = new pg.Client({ host:u.hostname, port:+u.port||6543, database:u.pathname.slice(1)||'postgres', user:decodeURIComponent(u.username), password:decodeURIComponent(u.password), ssl:{rejectUnauthorized:false} });
await c.connect();
// The dispatcher runs every minute: `where enabled=true and trigger->>'type'='schedule'`.
// A partial index keeps that read instant no matter how many skills exist, and
// stays tiny (only enabled scheduled skills are indexed).
await c.query(`create index if not exists skills_scheduled_enabled
  on skills (enabled)
  where enabled = true and (trigger->>'type') = 'schedule';`);
const r = await c.query(`select indexname from pg_indexes where tablename='skills' and indexname='skills_scheduled_enabled'`);
console.log('dispatcher index:', r.rowCount ? 'ready ✓' : 'MISSING');
await c.end();
