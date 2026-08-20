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
