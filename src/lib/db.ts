/**
 * Postgres client (Supabase). Present only when DATABASE_URL is set — otherwise
 * the app falls back to the local file store, so dev needs zero setup.
 * Supabase pooled connections require prepare:false.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
export const sql = url ? postgres(url, { prepare: false, ssl: 'require' }) : null;
export const hasDb = !!sql;
