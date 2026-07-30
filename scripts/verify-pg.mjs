import 'dotenv/config';
import pg from 'pg';
const u = new URL(process.env.DATABASE_URL);
const client = new pg.Client({
  host: u.hostname, port: Number(u.port || 6543), database: u.pathname.slice(1) || 'postgres',
  user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000,
});
try {
  await client.connect();
  const one = await client.query('select 1 as ok');
  console.log('✅ pg CONNECTED (select 1 =', one.rows[0].ok, ')');
  const s = await client.query('select count(*)::int c from skills');
  const k = await client.query('select count(*)::int c from knowledge_chunks');
  const v = await client.query("select 1 from pg_extension where extname='vector'");
  console.log('   skills:', s.rows[0].c, '| knowledge_chunks:', k.rows[0].c, '| pgvector:', v.rowCount ? 'ok' : 'MISSING');
} catch (e) { console.log('❌ pg ERROR:', e.message); }
finally { await client.end().catch(()=>{}); }
