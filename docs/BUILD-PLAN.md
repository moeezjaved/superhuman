# Cortex — Build Plan (how we build it, in order)

> The whole product = **two halves**. LemonLime built the first half beautifully and skipped the second. We build both.
> - **Half 1 — Authoring & grounding** (what LemonLime has): connect tools → learn the business → chat + author skills.
> - **Half 2 — Operating** (what LemonLime lacks): triggers → durable runs → enforced approvals → run history → ROI.
>
> We build Half 1 to parity fast, then Half 2 is where we win. Each phase ends with something you can *demo*.

---

## Phase 0 — Foundations (the plumbing)  · ~1 week
Everything later sits on this. No product yet, just the skeleton.
- Next.js app + TypeScript + Tailwind + our design tokens (`styles/tokens.css`).
- Postgres database + the schema (`db/schema.ts`), with per-workspace security (RLS).
- Login + workspaces + teammates/seats.
- **Durable execution engine wired NOW** (Inngest) — this is the thing that makes triggers + real waits possible. LemonLime's mistake was not having this; we put it in on day one.
- Billing (Stripe) skeleton + usage metering.
**Demo:** sign up → make a workspace → invite a teammate.

## Phase 1 — Grounded chat + connections (Half 1 parity)  · ~2 weeks
Now it starts feeling like LemonLime.
- Connect the first 5 tools (Gmail, Google Drive, Dropbox, Slack, Notion) via OAuth.
- **Ingestion pipeline:** read the website + connected files → build the knowledge layer (so the AI actually knows the business). This is the "1–2 hour learning" job — we make first answers work in minutes.
- The **runtime agent**: chat that searches your tools and answers **with sources cited**, using memory.
- Library (files / connections).
**Demo:** onboarding grounds a workspace from a URL + one connected app; chat answers real questions with citations.

## Phase 2 — The skill compiler + runs (the differentiator starts)  · ~2–3 weeks
This is the crown-jewel authoring experience.
- **The compiler** (`compiler-prompt.ts`): you describe a task in plain English → it produces a **Skill** (name, the SOP instructions, steps, and — unlike LemonLime — a real **trigger**), shown in a live preview. Grounded on the **capability registry** so it can never promise a tool we don't have.
- **Run engine** on the durable layer: execute a skill step-by-step, safely, with retries.
- **Run history + activity timeline:** every run shows exactly what it did (inputs, actions, what changed, cost). LemonLime has none of this.
- Seed our starter library (adapted from the 10 SOPs we extracted).
**Demo:** describe a skill → run it → see a full, auditable trace.

## Phase 3 — Autonomy + governance (this is where we beat them)  · ~2–3 weeks
The promise LemonLime markets but can't deliver.
- **Triggers fire on their own:** "every Monday 8am", a new Stripe failed payment, an inbound email, a webhook. Your AI team works while you sleep.
- **Real waits:** "wait 3 days, then follow up if no reply" actually pauses and resumes (durable execution).
- **Enforced approvals:** risky actions (send email, post to LinkedIn, issue refund) stop at a **confirmation card** and only run after you approve — enforced in code, not a prompt promise. Plus spend caps + recipient limits.
- **Daily brief:** "here's what your AI team did overnight, here's what needs you."
**Demo:** a skill fires overnight, drafts safely, routes a risky action to approval, reports in the morning brief.

## Phase 4 — Moat + proof  · ~2 weeks
Make the value visible so people renew.
- **Knowledge inspector:** see (and correct) what the AI learned about your business.
- **ROI dashboard:** "your AI team did the equivalent of X hours this month."
- **Discovery engine:** actually mine your Gmail/Slack for *your* repetitive work and propose tailored skills (LemonLime just seeds the same 10 for everyone).
**Demo:** inspect/correct knowledge; see hours saved; get a real tailored skill suggestion.

## Phase 5 — Act-as-you channels + commerce (our unique wedge)  · ~2 weeks
Things LemonLime literally does not have.
- **WhatsApp + Instagram + LinkedIn "act as you"** via Unipile (one integration, all channels — LemonLime only wired LinkedIn).
- **Native Shopify + Stripe + WooCommerce** (LemonLime has neither) — huge for DTC/e-commerce.
- Public API + webhooks so Cortex plugs into your other tools.
**Demo:** a WhatsApp outreach skill + a Shopify/Stripe skill running end-to-end.

---

## Where we are right now
- ✅ **Capability registry** (`src/lib/capabilities.ts`) — every action a skill can take, seeded from LemonLime's leaked catalog + our net-new connectors.
- ✅ **Core types** (`src/lib/types.ts`) — the Skill model + triggers + runs + approvals.
- ⏳ Next: compiler prompt, runtime prompt, DB schema, design tokens → then `create-next-app` and wire Phase 0.

## The order in one line
**Plumbing → Grounded chat → Skill compiler + run history → Triggers + approvals → Proof → Act-as-you/commerce.**
Half 1 (Phases 1–2) gets us to LemonLime parity; Half 2 (Phases 3–5) is the 10×.

## Rough timeline
~**12–14 weeks** to a product that clearly beats LemonLime, with a working demo at the end of every phase. A leaner "MVP that already out-features them" is achievable at the end of **Phase 3** (~8 weeks): grounded chat + skill compiler + triggers + approvals + run history.
