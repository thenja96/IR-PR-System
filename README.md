# Aegis MarketPulse AI

Internal AI-powered market intelligence and IR/PR opportunity platform for
**Aegis Communication Sdn Bhd**.

> Aegis MarketPulse AI is **not** a stock prediction tool. It is an AI-powered
> market intelligence, investor narrative, competitor monitoring, IR/PR
> opportunity, and private market analysis platform.

## Architecture summary

Two strictly separated workspaces:

| | Client IR/PR Workspace | Private Market Workspace |
|---|---|---|
| Purpose | Analyse Bursa-listed clients, investor concerns, IR/PR angles, add-on service opportunities | Private gold/macro analysis, trading journal, risk discipline |
| Visibility | `team` | `private_only` (owner-only, enforced by RLS — even admins cannot read it) |
| AI guardrail | No Buy/Sell/Hold, target prices, or investment advice; every output passes a rule-based compliance scan | No guaranteed outcomes, no "buy now"/"sell now", confirmation/invalidation language only |

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn-style UI
components · Supabase (Auth, Postgres, Storage, pgvector) · OpenRouter
(server-side only) · Recharts.

**Data flow for every AI module:**

1. UI form (config-driven, `lib/ai/modules.ts`) →
2. `POST /api/ai/analyze` (auth-checked, server-side) →
3. Prompt template (`lib/prompts/templates.ts`) interpolated — empty fields
   become `Missing Information` so the model flags gaps instead of inventing →
4. OpenRouter wrapper (`lib/openrouter/client.ts`: retry, fallback model,
   model routing by purpose) →
5. Client-workspace outputs pass the rule-based compliance scanner
   (`lib/compliance/checker.ts`) →
6. Run logged to `ai_analysis_runs` →
7. Markdown rendered with copy-to-clipboard.

**Numbers are computed in code, not by AI.** `lib/calculations/market.ts` and
`lib/calculations/company.ts` produce returns, drawdown, volatility, MAs,
YoY/QoQ, margins, gearing, ROE — the AI only interprets them.

## Setup guide

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. (Recommended for dev) Authentication → Providers → Email → disable
   "Confirm email" so you can sign in immediately.

### 3. Environment

```bash
copy .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — project API settings
- `OPENROUTER_API_KEY` — from [openrouter.ai/keys](https://openrouter.ai/keys)
- Model routing variables (sensible defaults are baked in):
  - `DEFAULT_LONG_ANALYSIS_MODEL` — annual reports / complex analysis
  - `DEFAULT_FAST_DRAFT_MODEL` — quick drafts, news impact, journal reviews
  - `DEFAULT_FINAL_WRITING_MODEL` — client-facing polished writing
  - `DEFAULT_VERIFIER_MODEL` — compliance checks
  - `FALLBACK_MODEL` — used when the primary model errors

The OpenRouter key is **server-side only**; all AI calls go through
`/api/ai/analyze`.

### 4. First user + seed data

```bash
npm run dev
```

1. Open http://localhost:3000 → sign up. **The first account becomes Admin**
   (database trigger).
2. Back in the Supabase SQL editor, run `supabase/seed.sql`. It attaches the
   two workspaces to your user and seeds: Chin Hin Group Berhad (5273) with
   peers, sample source documents, an opportunity + alert, a journal entry,
   the prompt template registry, model settings, and 60 days of demo market
   prices (gold, DXY, US10Y, VIX, US indices).

### 5. The core MVP flow

1. Sign in → Dashboard → **Client IR/PR Workspace**
2. Companies → add or open a company
3. Source Library → paste source text (or upload a file)
4. IR Angle Lab / Investor Concern Detector → run analysis
5. Add-On Opportunity Engine → scored opportunities with fee ranges
6. Report Builder → generate a client-ready Markdown deliverable → copy
7. Compliance Checker → rule-based scan + AI rewrite of any draft
8. Switch to **Private Market Workspace** → Gold Dashboard (charts + computed
   metrics pre-filled into the daily note)
9. AI Market Regime → classify regime with confirmation/invalidation
10. Trading Journal → record a trade → AI review
11. Risk Discipline Coach → pre-trade checklist

## Folder structure

```
app/
  (app)/                    authenticated shell (sidebar layout)
    dashboard/              global dashboard
    client/                 Client IR/PR workspace (15 modules)
    private-market/         Private Market workspace (12 modules)
    settings/               API, routing, prompts, roles, compliance rules
  api/ai/analyze/           the only AI endpoint (server-side)
  login/
components/
  ui/                       shadcn-style primitives (no radix dependency)
  layout/  shared/  ai/  charts/  client/  private/  settings/
lib/
  supabase/  openrouter/  ai/  prompts/  compliance/  calculations/
types/                      database, ai, company, market, reports
supabase/
  migrations/0001_init.sql  schema + RLS + triggers + storage bucket
  seed.sql                  sample data
```

## Roles

| Role | Permissions |
|---|---|
| admin | Manage users, workspaces, prompt library; view all client reports |
| analyst | Upload sources, run analysis, generate reports, edit companies |
| writer | Generate PR/IR content, edit outputs, report builder |
| viewer | Read-only dashboards and reports |

Change roles in the `users_profile` table (Supabase dashboard) for MVP.

## Compliance rules

Client workspace outputs are scanned for banned phrases (Buy/Sell/Hold,
target price, fair value, accumulate, take profit, guaranteed upside, sure
win, entry/exit price, trading call, certainty hype). Violations are flagged
in the UI with suggested replacements (key observation, market watchpoint,
investor concern, valuation watchpoint, requires verification…), and a
sanitized version is offered. The Compliance Checker page also runs an AI
rewrite using the verifier model.

## Intentionally excluded from MVP

- Automated Bursa announcement scraping (manual paste instead)
- Real-time WebSocket price feeds (manual/seeded data instead)
- PDF / DOCX export (Markdown + copy-to-clipboard instead)
- WhatsApp, CRM, and email integrations
- PDF text extraction (paste text into Source Library instead)
- Embedding generation / RAG retrieval (the `document_chunks` table and
  pgvector index are ready; the pipeline is a next phase)
- Economic calendar API (manual macro event input)
- In-app prompt template editing (templates ship in code; registry is seeded)
- In-app user/role management UI

## Suggested next-phase roadmap

1. **RAG pipeline** — chunk + embed source documents on upload, retrieve into
   prompts with citations (tables already in place).
2. **Bursa monitoring** — scheduled fetch of company announcements, auto-run
   the Announcement Radar, raise alerts.
3. **Market data feed** — daily price ingestion + `market_metrics` computation
   job; volume-spike and level alerts.
4. **Opportunity pipeline CRM** — save Add-On Engine output directly into
   `client_opportunities` with status workflow (open → proposed → won).
5. **Exports** — PDF/DOCX report export with Aegis branding.
6. **Role management UI** + per-client workspace assignment.
7. **Economic calendar integration** for Macro Watch and Scenario Planner.
8. **Streaming AI responses** for long analyses.
