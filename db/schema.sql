-- Cortex — Supabase/Postgres schema. Paste into Supabase SQL editor (or psql).
create extension if not exists vector;

create table if not exists skills (
  id           text primary key,
  workspace_id text not null default 'ws_demo',
  name         text not null,
  spec         jsonb not null,          -- the full SkillDraft
  trigger      jsonb not null,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists skills_ws on skills(workspace_id);

create table if not exists runs (
  id           text primary key,
  workspace_id text not null default 'ws_demo',
  skill_id     text,
  status       text,
  started_at   timestamptz,
  data         jsonb not null           -- the full Run (steps, diffs, cost, hoursSaved)
);
create index if not exists runs_ws on runs(workspace_id, started_at desc);

create table if not exists knowledge_chunks (
  id           text primary key,
  workspace_id text not null default 'ws_demo',
  source       text not null,
  text         text not null,
  embedding    vector(1536) not null,
  created_at   timestamptz not null default now()
);
create index if not exists kb_ws on knowledge_chunks(workspace_id);
-- cosine similarity index (build after some rows exist for best results):
create index if not exists kb_vec on knowledge_chunks using hnsw (embedding vector_cosine_ops);
