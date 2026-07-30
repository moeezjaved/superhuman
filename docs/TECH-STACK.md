# Cortex — Concrete Tech Stack (chat, agents, scrapers, everything)

> What we actually use to build it. Split by subsystem, with a recommended tool per piece and **build vs buy**. Rule: **buy the commodity plumbing, build the differentiated IP** (orchestration, governance, knowledge layer, compiler).

---

## 1. The chat (what powers the conversation)
| Piece | Tool | Why |
|---|---|---|
| Streaming + tool-calling | **Vercel AI SDK** (`streamText` + `tools`) | Same streaming feel LemonLime has; native tool-calling loop; provider-swappable |
| Chat UI | AI SDK UI (`useChat`) + React + Tailwind | Token streaming, tool-call rendering, source pills |
| Model router | **AI SDK providers** or **OpenRouter/LiteLLM** | Swap GPT ↔ Claude ↔ Gemini per step; cheap model for extraction, strong for planning |
| LLMs | **Anthropic Claude** (primary reasoning) + **OpenAI GPT** (fallback/cheap) + **Google Gemini** (long-context/cheap) | Model-agnostic like LemonLime; the knowledge layer is the durable moat, not the model |

**Chat = a tool-calling agent loop.** The model gets a system prompt + memory + retrieved knowledge + the capability catalog, then calls tools (read/search = free, writes = gated) until it produces an answer. Streamed to the browser.

## 2. How we build agents (the orchestration)
Two agent roles (from LemonLime's architecture, doc 29), each = **a prompt + a tool set + a context builder**:
- **Runtime agent** — chat + skill execution. Tools: read/search across connectors + the gated write actions + composite tools.
- **Compiler agent** — NL → Skill draft. One tool: `updateDraft`. No data access.

Building blocks:
- **Context assembly** (build): system prompt + `memory` + retrieved `knowledge_chunks` (with sources) + capability catalog + (if running a skill) its `hot_section` SOP.
- **Tool layer** (build): every tool checked against the capability registry (`src/lib/capabilities.ts`) — code-enforced, so it can't call/promise a tool it wasn't granted.
- **Durable execution** (buy): **Inngest** — this is the engine that runs skills as background jobs with **cron triggers, event triggers, real waits (sleep/waitForEvent), retries, and run history.** *This is the exact layer LemonLime lacks.* (Alt: Temporal for max control.)
- **Approvals** (build): a run suspends on an `ApprovalRequest`, renders the confirmation card, resumes on decision (Inngest `waitForEvent`).
- **Evals** (buy): **Langfuse** or **Promptfoo** — golden-set tests so swapping models doesn't break "drafts only" / output format.

## 3. Scrapers & data acquisition  ← the "lot of stuff" you flagged
Several features are **useless without web data**. Here's each and what powers it:

| Feature | Needs | Tool (buy) |
|---|---|---|
| **Learn the business** (onboarding) | Crawl the company website → clean text for the knowledge layer | **Firecrawl** (`/crawl` → LLM-ready markdown) or Crawlee/Playwright self-hosted |
| **AEO / AI-search visibility** | Crawl site + sitemap + competitor pages, grade content | Firecrawl + our AEO checklist |
| **Web-search grounding** (outside facts, with citations) | Live web search API | **Tavily** or **Exa** (LLM-native search) or Brave Search API |
| **Lead sourcing** (`source_and_enrich_leads`) | Find companies/people matching an ICP | **Apollo.io API** or **People Data Labs** (B2B data) — or LinkedIn search via **Unipile** |
| **Lead enrichment** | Fill emails/titles/company | Apollo / PDL / Clearbit + **email verification** (NeverBounce / ZeroBounce) |
| **Competitor research** | Public web + ad libraries etc. | Tavily/Exa + Firecrawl (+ your existing Selfmade ad-DNA data if reused) |

> Build-vs-buy: **buy the data (Firecrawl + Tavily/Exa + Apollo/PDL)** — building crawlers/proxy pools/data-graphs is a company unto itself. We wrap them behind our own `composite tools` (`source_and_enrich_leads`, etc.) so the agent sees one clean tool.
> (Note: LinkedIn/WhatsApp "act as you" scraping/sending is Unipile — see §5. Respect rate limits + ToS; gate behind approvals.)

## 4. Knowledge layer / retrieval (RAG + graph)
| Piece | Tool |
|---|---|
| Vector store | **Postgres + pgvector** (HNSW), namespaced per workspace |
| Embeddings | OpenAI `text-embedding-3` or Voyage/Cohere |
| Hybrid search | pgvector (semantic) + Postgres FTS/BM25 (keyword) + rerank (Cohere rerank) |
| Entity graph | Postgres tables (`kg_entities`/`kg_edges`/`kg_facts`, doc 22) |
| Ingestion pipeline | Inngest jobs: connector/crawl → chunk → embed → upsert (with provenance + freshness) |

## 5. Integrations (connectors + act-as-you)
| Piece | Tool |
|---|---|
| OAuth token mgmt + many connectors | **Nango** or **Paragon** (unified OAuth; Gmail/Drive/Dropbox/Slack/Notion/HubSpot/Shopify) — saves months |
| Act-as-you messaging | **Unipile** (LinkedIn + **WhatsApp** + Instagram + Telegram + email/calendar) — one API, all channels |
| Commerce/payments | **Shopify Admin API** + **Stripe API** (native — LemonLime has neither) |
| Meeting notes | Integrate **Granola**-style (or Recall.ai for transcripts) |

## 6. Data stores & infra
| Piece | Tool |
|---|---|
| App/hosting | **Vercel** (Next.js App Router) |
| Primary DB | **Postgres** (Neon or Supabase) + pgvector |
| Cache / queue / rate-limits | **Redis** (Upstash) |
| Object storage (files/media) | **S3 / Cloudflare R2** |
| Durable jobs / triggers | **Inngest** |
| Secrets / tokens | KMS-encrypted columns or a secrets manager (never plaintext OAuth tokens) |

## 7. Auth, billing, observability
| Piece | Tool |
|---|---|
| Auth (+ SSO later) | **Clerk** (fast) or **WorkOS** (SSO/SCIM for enterprise) |
| Billing + metered usage | **Stripe** (+ usage events → plan gating) |
| Product analytics | **PostHog** (same as LemonLime) |
| Errors | **Sentry** |
| LLM tracing / cost / evals | **Langfuse** (per-run traces, token cost, prompt versions, evals) |

---

## Build vs Buy — the one-glance summary
**BUY (commodity):** LLMs, streaming SDK, model router, crawlers (Firecrawl), search (Tavily/Exa), lead data (Apollo/PDL), OAuth/connectors (Nango), act-as-you (Unipile), durable exec (Inngest), auth (Clerk/WorkOS), billing (Stripe), analytics (PostHog), tracing (Langfuse), DB (Neon), cache (Upstash), storage (R2).

**BUILD (our IP — this is the company):**
1. The **capability registry + code-enforced governance** (permissions, approvals, caps).
2. The **skill compiler** (NL → Skill w/ trigger, grounded on the registry).
3. The **runtime agent** (context assembly + tool loop + citations).
4. The **knowledge layer** (ingestion + hybrid retrieval + inspectable/correctable graph).
5. The **run engine glue** on Inngest (triggers → durable runs → traces → ROI).
6. The **discovery engine** (mine connected data → tailored skills).

## Minimum to start (Phase 0–2, the MVP core)
Next.js + Postgres/pgvector + Vercel AI SDK (Claude+GPT) + Inngest + Clerk + Stripe + Firecrawl + Tavily + Unipile + Nango. Everything else layers on later.

## Cost note
Main variable cost = **LLM tokens + data APIs (crawl/search/leads)**. That's why the knowledge layer (minimize context), a model router (cheap model where possible), and per-workspace usage caps matter — same margin levers LemonLime uses, applied harder.
