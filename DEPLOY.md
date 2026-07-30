# Cortex — Deploy (Vercel + Supabase + Inngest Cloud)

## Accounts to create (all free tier)
1. **GitHub** — push the repo (Vercel deploys from it).
2. **Supabase** — Postgres + pgvector (persistence).
3. **Vercel** — hosts the Next.js app.
4. **Inngest Cloud** — runs the triggers/cron in production.

## Steps
### 1. Supabase (database)
- Create a project → **SQL Editor** → paste & run `db/schema.sql` (creates tables + enables pgvector).
- Project Settings → Database → **Connection string (URI, "Transaction"/pooler)** → this is `DATABASE_URL`.

### 2. Inngest Cloud (triggers)
- Create an app → get **INNGEST_EVENT_KEY** and **INNGEST_SIGNING_KEY**.
- (No code change — the `/api/inngest` route is already the sync endpoint.)

### 3. Push to GitHub
```
cd ~/Downloads/cortex
git add -A && git commit -m "Cortex core"
git branch -M main
git remote add origin https://github.com/<you>/cortex.git
git push -u origin main
```

### 4. Vercel (deploy)
- New Project → import the GitHub repo → framework auto-detected (Next.js).
- **Environment Variables** (Production):
  | Key | Value |
  |---|---|
  | `OPENAI_API_KEY` | your **rotated** key |
  | `DATABASE_URL` | Supabase pooled URI |
  | `INNGEST_EVENT_KEY` | from Inngest |
  | `INNGEST_SIGNING_KEY` | from Inngest |
  - Do **NOT** set `INNGEST_DEV` in production.
- Deploy. Then in **Inngest Cloud → Sync app**, point it at `https://<your-app>.vercel.app/api/inngest`.

### 5. Verify
- Visit the Vercel URL → build a skill → save → it persists to Supabase.
- Inngest Cloud dashboard shows the `schedule-dispatcher` cron + `run-skill` function; scheduled skills fire in prod.

## Notes
- Local dev needs none of this — with no `DATABASE_URL`, it uses the file store; with no Inngest keys, run the local `inngest-cli dev`.
- Rotate the OpenAI key first (it was pasted in chat).
