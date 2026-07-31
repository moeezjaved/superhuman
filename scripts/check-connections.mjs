import 'dotenv/config'; import pg from 'pg';
const u = new URL(process.env.DATABASE_URL);
const c = new pg.Client({ host:u.hostname, port:+u.port||6543, database:u.pathname.slice(1), user:decodeURIComponent(u.username), password:decodeURIComponent(u.password), ssl:{rejectUnauthorized:false} });
await c.connect();
const r = await c.query('select workspace_id, provider, connection_id, created_at from connections order by created_at desc limit 20');
console.log('connections in Supabase:', r.rowCount);
r.rows.forEach(x => console.log('  -', x.provider, '| ws:', x.workspace_id.slice(0,20), '| conn:', String(x.connection_id).slice(0,18)+'…', '|', x.created_at));
await c.end();
