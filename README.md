# Money Mountain

Which market segment should we focus on first? Type in a category, geography, and brand, and get an AI-drafted first pass at a "Money Mountain" — a market-sizing and segment-selection model — instead of building the analysis from scratch every time.

The funnel this app replicates (based on VAIO's Enterprise Laptops × Singapore Money Mountain):

1. **Framing & Dimensions** — the commercial question, plus the three dimensions this category needs: a *scale* dimension (deal/fleet-size proxy), a *profile* dimension (predicts buyer need), and a *fit-filter* dimension (price/positioning tiers the brand can or can't win).
2. **TAM** — a top-down benchmark reconciled against an independent bottom-up build across the scale dimension.
3. **Segment Matrix** — scale × profile account-count matrix. Interior cells are filled deterministically (iterative proportional fitting) from sourced row/column totals — modeled, not observed.
4. **Needs & Fit** — a vendor-independent needs framework, mapped to this brand's fit, then applied to each profile value to infer its dominant need.
5. **Pricing / Positioning Filter** — the fit-filter dimension as a positive/negative filter against the product line (not additive market size), including explicit no-go zones.
6. **Shortlist** — segments ranked into Top / Watchlist / Trap tiers with rationale, risk, and a concrete next field question.
7. **Battlefield** — the payoff screen: the mountain (bar chart), the pick, a ranked table, and what would change the answer.

Every number is tagged **sourced** / **modeled** / **assumed** with a source note — that's the trust mechanism, not decoration.

## Current status

Deployed and live on Vercel (`noc-1575's projects`), backed by Supabase Postgres. Two categories have been run end-to-end live (VAIO/laptops, Marketo/software). **Starting a new session on this project?** Read `DECISIONS.md` first (why things are the way they are, full commit history, and a flagged environment constraint you need to know immediately), then `NOTES.md` (open items) — both are faster than re-deriving context from the code.

## Running locally

Storage is Postgres via Supabase (the app's tables live in a dedicated `money_mountain` schema, separate from any other app sharing that project). You need a `DATABASE_URL`:

```bash
cp .env.example .env.local
# edit .env.local, set DATABASE_URL to the Supabase connection string
# (Project Settings -> Database -> Connection string -> "Transaction pooler")
npm install
npm run dev
```

Open http://localhost:3000.

Schema changes are applied directly against Supabase (via the Supabase MCP tools or dashboard/CLI), not through a drizzle-kit migrator baked into app startup — `lib/db/schema.ts` describes the current shape, but changing it means applying the matching SQL against both the `money_mountain` and `money_mountain_test` schemas yourself.

### Mock mode vs. live mode

**No `ANTHROPIC_API_KEY` set (default):** every stage drafts from a hand-authored fixture (`lib/llm/fixtures/*.json`) built from the original VAIO/Singapore spreadsheet. The whole app — intake, all 7 stages, the battlefield chart — is fully demoable this way. Every stubbed stage shows a banner making this explicit, since mock mode returns the *same* VAIO example regardless of the category/geography/brand you typed in.

**With `ANTHROPIC_API_KEY` set:** stages 1–5 call the live Anthropic API — a web-search research call followed by a structured-output call against that stage's schema — and draft content for your actual input. Stages 6–7 are synthesis-only (one structured-output call each, no web search). Copy `.env.example` to `.env.local` and set the key to try this.

```bash
cp .env.example .env.local
# edit .env.local, set ANTHROPIC_API_KEY
```

The research+structure split (rather than one call doing both) hasn't been validated against a live key yet — treat it as the first thing to check if live drafting misbehaves.

### Debug a live run stage-by-stage

```bash
npm run pipeline:debug -- --category="..." --geography="..." --brand="..." [--product-description="..."] [--name="..."]
```

Runs the full 7-stage pipeline against **live** Anthropic calls (refuses to run in mock mode — mock always returns the same canned VAIO fixture regardless of input, so it can't validate a new category) and prints each stage's research findings, source URLs, and structured JSON output to the terminal as it happens. Use this instead of clicking "Generate" one stage at a time in the browser when you want to see *why* the model concluded what it did, not just the final battlefield chart. Pipe to `tee` for a saved transcript: `npm run pipeline:debug -- ... | tee debug-runs/run.log`.

**Cost/time callout:** 5 of 7 stages make two live Anthropic calls each, stages 6–7 make one each — **12 live API calls per full run**, plausibly several minutes end-to-end, real spend every time it's run. Not something to loop on casually.

### Seed the VAIO example

```bash
npm run seed:vaio
```

Creates the VAIO / Enterprise laptops / Singapore project through the normal intake + generate path (not special-cased code) and runs all 7 stages. Visit `/projects/<id>/battlefield` afterward.

### Tests

```bash
npm test
```

Covers: Zod schema validation, the IPF matrix-fill algorithm, the DB repo layer, and a full 7-stage pipeline run end-to-end against the mock LLM client. Tests run against the isolated `money_mountain_test` schema in the same Supabase database — never `money_mountain` — so they don't touch real project data. Requires `DATABASE_URL` to be set (same as running the app).

## Known MVP simplifications

- **Editing is per-field JSON, not per-field forms.** The `PATCH /api/projects/:id/payload` endpoint validates and replaces one whole stage's output against its schema. There's no bespoke edit form per stage yet — regenerating a stage is the primary way to change its content.
- **One product profile per project, not a shared library.** Product/brand fit criteria is drafted fresh per project (stage 4/5), matching "a new brand each time" — there's no reusable cross-project product-profile store yet.
- **No auth.** Single local workspace (`createdBy` defaults to a constant). The schema leaves room for real auth later without a migration.
- **Economics (margin/price/volume) is out of scope.** The single question this tool answers is "which mountain should we focus on" — stages 1–7 cover that. Add an economics stage later if a real need shows up.
- **Matrix size is capped** (≤6 scale values × ≤8 profile values) — a hypothesis model, not precision engineering.

## Project structure

- `lib/schema/` — Zod schemas; the source of truth for every stage's shape, including the sourced/modeled/assumed tagging primitive (`common.ts`).
- `lib/db/` — Drizzle + Postgres (Supabase). `schema.ts` (tables, in the `money_mountain` schema), `client.ts` (connection), `repo.ts` (CRUD, all async).
- `lib/pipeline/` — the stage graph. `types.ts` (stage contract), `stage-registry.ts` (registry + `runStage`/`isStageStale`), `ipf.ts` (deterministic matrix fill), `stages/*.ts` (one module per stage).
- `lib/llm/` — `client.ts` (the `LlmClient` interface), `mock-client.ts` / `anthropic-client.ts` (implementations), `factory.ts` (graceful fallback), `fixtures/*.json` (the VAIO mock data).
- `app/` — Next.js App Router pages and API routes.
- `components/` — shared UI, including per-stage view components under `stage-views/`.
