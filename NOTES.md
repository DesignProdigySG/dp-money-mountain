# Notes to self

Open product/architecture items, not yet built. Written 2026-08-20 after the
first live (non-mock) test run on Vercel.

## 1. Auto-chain the stages

**Current state:** stage-by-stage, manual. Each of the 7 stages needs its own
"Generate" click on its own page (`app/projects/[id]/stage/[stageId]/page.tsx`
→ `components/GenerateButton.tsx` → `POST /api/projects/:id/stages/:stageId/generate`
→ `runStage()` in `lib/pipeline/stage-registry.ts`). This was deliberate for
the MVP — it's what let us catch and fix the DB/framework/timeout bugs one
stage at a time instead of debugging a single 7-stage black box.

**Desired end state:** type category × geography × brand once, get the full
battlefield without touching anything in between. The step-by-step UI
shouldn't disappear — it's still the right place to review/edit/regenerate a
single stage — but there should be a "Run all" path that chains stage1
through stage7 automatically, stopping only if a stage errors.

**Rough approach:** `runStage()` already takes a single `stageId`; a
`runAllStages(projectId)` wrapper could loop `STAGE_ORDER` and call it
per-stage sequentially (must be sequential — each stage's `buildInput` reads
prior stages' output from the payload). Given each stage can now take up to
`maxDuration = 300`s, 7 stages back-to-back could approach 30+ minutes
worst-case in one HTTP request, which won't survive a single Vercel function
call even at the raised ceiling. This needs a different execution model, not
just a bigger timeout — options: a queue/background job (Vercel Cron trigger
polling, or Inngest/Trigger.dev-style durable execution), or a client that
calls `/generate` for stage N, then automatically calls it again for stage
N+1 on success, so each stage is still its own short-lived request but the
*user* only clicks once. The client-polling approach is the smaller lift.

## 2. No visibility into the "research" pass

**Confirmed by reading the code** (e.g. `lib/pipeline/stages/stage2-tam.ts`):
every grounded stage makes two calls — `llm.research()` (web search, returns
freeform findings + source URLs) then `llm.structure()` (turns those findings
into the stage's actual schema-shaped output). The research call's raw text
and sources are used as *input* to the structure call and then **thrown
away** — never written to `stage_runs`, never returned from the API, never
rendered anywhere. So right now, when a stage's output looks wrong, there's
no way to see *why* the model concluded what it did — no intermediate
reasoning, no list of what it actually searched for or found.

**Fix:** persist the research pass alongside the structured output, and
surface it in the UI.
- `lib/db/schema.ts` — `stage_runs.output` is already a jsonb column; either
  widen it to `{ research: { text, sources }, structured: T }`, or add a
  sibling `research jsonb` column. Column-per-concern is probably cleaner
  for querying later.
- `lib/pipeline/types.ts` / each `stages/*.ts` module — `run()` needs to
  return both pieces instead of discarding `research` after use.
- `lib/pipeline/stage-registry.ts` (`runStage`) — pass the research pass
  through to `recordStageRun`.
- UI — a collapsible "Research notes" panel per stage view
  (`components/stage-views/`?), showing the raw findings + cited source
  URLs, collapsed by default so it doesn't clutter the normal read.
- Cheap adjacent win: also record wall-clock duration for each of the two
  calls (`research` vs `structure`) in `stage_runs` — directly useful for
  the "why is this stage slow" question from today, without needing to dig
  through Vercel runtime logs each time.

## 3. Stage 2's TAM formula is hardcoded to a durable-goods shape

**Surfaced by:** testing a second real category (Marketo — marketing
automation software) alongside VAIO. The dimension *labels* generalize fine
(Stage 1's prompt already says "don't assume industry/employee-size, pick
whatever fits the category" — that part works). The bug is one level deeper:
Stage 2's schema (`lib/schema/stage2-tam.ts`, `BottomUpRow`) hardcodes every
category through

```
accounts × avgUnitsPerAccount × penetration ÷ cycleYears
```

which is VAIO's laptop-replacement math with the field names kept generic,
not a genuinely category-agnostic formula. A subscription product like
Marketo doesn't have a "replacement cycle in years" — it renews or churns,
it doesn't wear out and get replaced. Forcing it through this schema means
the model either produces nonsense or fakes a plausible-looking "cycle" to
satisfy the schema. (Stage 5's pricing/fit-filter is *not* affected — it's
already fully generic, no hardcoded concept baked into its schema, just
whatever `fitFilterDimension` Stage 1 picked.)

**Fix:** apply the same "fixed options, mixed and matched by product type"
idea already used for dimensions to the TAM formula itself — a small fixed
library of TAM *shapes*, picked per category instead of one formula forced
on everything:
- **Replacement-cycle** (current/only option today) — `accounts × units/account
  × penetration ÷ cycle years` — durable goods, hardware.
- **Recurring-revenue** — `accounts × penetration × avg contract value` —
  subscriptions, SaaS.
- **Consumption** — `accounts × usage volume × unit price` — metered/usage-based.
- **Project-based** — `accounts × deals/year × avg deal size` — services.

Stage 1 would pick the shape alongside the dimensions it already picks
(add a field to its output, e.g. `tamModelShape`); Stage 2's schema and
`reconcile()` branch on it (likely a Zod discriminated union on
`BottomUpRow`, keyed by shape). Everything downstream (stage 3 onward) is
unaffected — they only ever consume dimension labels and the final
`annualizedDemand` number, never Stage 2's internal fields, so this should
be a contained change.

Explicitly separate from — and a prerequisite for — the longer-term vision:
letting someone shape the market view themselves via chat (since only the
person running the analysis really knows what's meaningful for their
category), picking and combining from a fixed library of dimensions/shapes
rather than either a rigid schema or the model inventing something fresh
each time. Not building that now; noting it so the TAM-shape fix above is
designed compatibly with it — `dimensionPlan` is already its own editable
payload field, so a future chat interface mainly needs to let someone
override what Stage 1 already picks, not restructure the payload.
