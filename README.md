# Cortex — AI Operations Platform (LemonLime successor)

> Codename **Cortex**. An AI operations platform for SMBs: connect your tools, describe work in plain English, and a grounded, governed AI team runs it — on triggers, with enforced approvals and full run history. Built from the LemonLime teardown in `~/Downloads/LemonLime Reverse Engineering/`.

## The thesis (why we beat LemonLime)
LemonLime nailed **authoring** (NL→SOP compiler, live preview, capability catalog, editable memory, grounded run-time) but skipped the **operating half**. Cortex keeps their genius and adds what they structurally lack:

| Gap in LemonLime | Cortex |
|---|---|
| No triggers/scheduling (100% manual "Run") | **Trigger engine** (schedule/event/webhook/inbound-email) |
| Automations = markdown SOP, no real waits/branches | **Durable execution** (real waits, wait-for-event, resume) |
| Approval = prompt convention (soft) | **Code-enforced permission + approval gates** |
| No run history/audit (live tracker only) | **Persistent run traces + audit log** |
| Over-promises connectors (prompt-only capability check) | **Hard capability registry** (code-enforced) |
| No Shopify/Stripe/WhatsApp; hollow tiles | **Native commerce + WhatsApp/IG via Unipile** |
| Card-gated, no value-before-signup | **Value before card** (metered free trial) |

## Architecture (2 agents, from doc 29)
- **Runtime agent** — grounded (memory + retrieval + citations + web search), holds the write tools, does chat AND executes skills (follows the `hot_section` SOP). Show-then-approve for writes.
- **Compiler agent** — stateless, single tool `updateDraft`, turns NL → a `Skill` draft (name/description/`hot_section`/steps/trigger). No data access.
> (LemonLime internally calls automations "skills" — we keep that term.)

## Stack
Next.js (App Router, RSC) · TypeScript · Tailwind + shadcn/ui · Drizzle ORM + Postgres (+ pgvector) · Inngest (durable execution + triggers) · a model gateway (OpenAI/Anthropic/Google) · Unipile (act-as-you messaging) · Stripe (billing) · PostHog.

## Layout
```
src/lib/capabilities.ts   # the capability registry (atomic + composite tools) — doc 28/31
src/lib/types.ts          # Skill/draft schema + triggers + runs — doc 29/22
src/lib/compiler-prompt.ts# the NL→Skill compiler system prompt — doc 29 (LemonLime prompt + our triggers)
src/lib/runtime-prompt.ts # the runtime/executor agent prompt — doc 12/29
db/schema.ts              # Drizzle schema — doc 22
styles/tokens.css         # design tokens — doc 30 (re-skinned from LemonLime)
docs/BUILD-PLAN.md        # phase-by-phase build (doc 21/23/25)
```

## Getting started (run these)
```bash
cd ~/Downloads/cortex
npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --use-npm
npm i drizzle-orm postgres inngest ai @ai-sdk/openai @ai-sdk/anthropic zod
npm i -D drizzle-kit
# then wire db/schema.ts, set env (DATABASE_URL, model keys, UNIPILE_DSN/TOKEN, STRIPE_*)
```

## Source of truth
Every design decision here traces to a numbered doc in the teardown. See `docs/BUILD-PLAN.md` for the mapping and phase order.
