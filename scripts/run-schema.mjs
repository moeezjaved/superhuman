import 'dotenv/config';
import fs from 'node:fs';
import pg from 'pg';
const u = new URL(process.env.DATABASE_URL);
const client = new pg.Client({
  host: u.hostname, port: Number(u.port || 6543), database: u.pathname.slice(1) || 'postgres',
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000,
});
const ddl = fs.readFileSync('db/schema.sql', 'utf8');
try {
  await client.connect();
  await client.query(ddl);
  const t = await client.query("select table_name from information_schema.tables where table_schema='public' and table_name in ('skills','runs','knowledge_chunks') order by table_name");
  const v = await client.query("select 1 from pg_extension where extname='vector'");
  console.log('✅ schema applied. tables:', t.rows.map(r=>r.table_name).join(', '), '| pgvector:', v.rowCount?'enabled':'MISSING');
} catch (e) { console.log('❌ schema error:', e.message); }
finally { await client.end().catch(()=>{}); }
