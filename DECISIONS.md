# Decisions log

Why things are the way they are, in the order they were decided. Read this
before re-litigating a choice — if it's here, it was deliberate. Pairs with
`NOTES.md` (open items, not yet built) and `ARCHITECTURE.md` (the system's
current shape). Update this file whenever a real decision is made, not every
commit — a decision is "we chose X over Y because Z," not "fixed a typo."

## Product scope

- **AI-drafted, not manual-builder, not demo-only.** A category/geography/brand
  input gets a first-pass draft from a live LLM (web search + structured
  output), clearly tagged `sourced` / `modeled` / `assumed` on every fact —
  not a rigid form the user fills in by hand, and not limited to one
  hardcoded example forever.
- **Product/brand fit criteria is defined per project, not hardcoded to
  VAIO.** VAIO's original spreadsheet became the first example project run
  through the normal intake path, not special-cased app logic — because the
  whole point is teammates spinning up a fresh project per category/brand.
- **7-stage funnel**, matching the user's own manually-described reasoning
  process (not just the spreadsheet's tab structure): framing & dimensions →
  TAM → segment matrix → needs & fit → pricing/positioning filter →
  shortlist → executive rollup ("the mountain"). Each stage is one job.
- **Economics (margin/price/volume) dropped from MVP scope.** The single
  question this tool answers is "which mountain should we focus on" — the 7
  stages already answer that; economics is downstream commercial modeling
  the user didn't find useful for that question. Can be added later as its
  own stage.
- **Multi-project storage from day one**, even though only one person was
  running it locally at first — teammates reusing this later was always the
  point, so "one saved project at a time" was never on the table.
- **No auth in the MVP.** `createdBy` defaults to a constant. Deliberately
  deferred, not forgotten — real auth is real work, and wasn't the blocker
  to proving the concept.
- **Dimensions are category-specific, decided by the model per project** —
  not a fixed "industry × employee size" schema. Stage 1 picks whatever
  scale/profile/fit-filter dimensions actually fit the category being
  analyzed.
- **The `sourcedValue` tagging primitive (sourced/modeled/assumed + source
  URL/note) is structural, not a UI convention** — it's baked into the Zod
  schema everywhere a fact appears, so the trust mechanism can't be
  accidentally dropped by a future stage.
- **Two physical LLM calls per grounded stage (research, then structure),
  not one.** Mixing a mid-turn web-search tool call with a forced
  structured final answer isn't a documented-safe combination, so the
  pattern is deliberately split and debuggable.
- **Regenerating a stage doesn't auto-cascade downstream stages.** Each
  stage page shows a staleness badge (via a content-hash comparison,
  `generatedFromInputHash`) instead of forcing a full re-run — the user
  decides when to regenerate what.

## Architecture

- **Postgres via Supabase, not local SQLite** — see Infrastructure below;
  originally SQLite for a pure local prototype, migrated once deployment to
  Vercel was decided (SQLite doesn't survive serverless).
- **Zod is the source of truth for every shape**, not the database — the DB
  just stores validated JSON (`payload jsonb`), so the schema can keep
  evolving without a migration-tooling treadmill.
- **`ARCHITECTURE.md` rev. 2**: the pipeline is documented with
  extract/transform/validate/load/serve as the real structural axis, with
  the 7 business stages shown as one orchestration sequence running that
  same shape 7 times — rev. 1 had colored all 7 stages uniformly as "LLM
  transform," which was a flowchart of product steps, not an actual
  data-engineering decomposition. Rev. 2 also added the staleness/
  change-detection mechanism as its own diagram (a genuine incremental-
  recompute pattern, the one piece of this system that's data-engineering
  in its own right) and named mutable-vs-immutable storage with correct
  terms (including the still-unhandled concurrent-write case on
  `projects.payload`).
- **Reference-data cache for Stage 2's `accounts` field** (2026-08-21):
  Singapore business counts by employee-size band are a fixed government
  statistic (MOM/SingStat), not a category-specific estimate — every
  project was re-deriving it via a fresh live web search, risking two
  Singapore projects disagreeing on what should be the identical number. A
  scale dimension can now self-declare a `canonicalKey` referencing a
  cached, geography-scoped dataset (`money_mountain.reference_datasets`);
  Stage 2 overrides the model's answer with the cached figure on a hit
  (inject-then-override, no schema branching) and writes back on a miss
  (new key, or an entry older than a 180-day soft-staleness window),
  self-refreshing the cache over time with no scheduler needed. Explicitly
  scoped to prove the mechanism with one entry (`sg-employee-size-standard`)
  — not a general dimension-library UI; see `NOTES.md` for what's deferred.

## Infrastructure

- **Vercel + Supabase**, using the user's existing accounts/team
  (`noc-1575's projects` on Vercel; the DesignProdigySG Supabase org) rather
  than provisioning anything new by default.
- **Reused the existing Supabase project, in a dedicated `money_mountain`
  schema** (plus an isolated `money_mountain_test` schema for tests) —
  rather than paying for a second, fully separate Supabase project ($10/mo).
  Cost-conscious call for an internal MVP; easy to split out later if this
  becomes more than an internal tool.
- **Supabase's own migration tooling (`apply_migration`) is the schema
  source of truth, not drizzle-kit.** Running two separate migration
  trackers against the same database invites drift; Drizzle here is the
  query layer only.
- **Supabase connection must use the Supavisor pooler, not the direct
  host.** `db.<ref>.supabase.co` resolves IPv6-only and both this session's
  sandbox and (initially) Vercel's serverless runtime couldn't reach it —
  `getaddrinfo ENOTFOUND`. Fixed by switching `DATABASE_URL` to
  `aws-0-<region>.pooler.supabase.com:6543` with username
  `postgres.<project-ref>` (not just `postgres`) and `prepare: false` on the
  postgres-js client (required for Supavisor's transaction-mode pooling).
- **`vercel.json` explicitly pins `"framework": "nextjs"`.** The very first
  Vercel import auto-detected the framework as "Other" (the repo only had a
  placeholder README at that point), and — critically — clicking "Redeploy"
  on a later, correct commit carried that stale per-deployment config
  forward instead of picking up the project's current settings. A fresh git
  push (not a Redeploy of an old deployment) was needed to actually pick up
  the corrected framework once `vercel.json` was added.
- **`maxDuration = 300` on the stage-generate API route.** Grounded stages
  make two sequential live Anthropic calls (research + structure); the
  platform's default function duration was too short, and a killed function
  returns no response at all — the browser just hangs on "Generating…"
  forever with nothing in the logs, which is what live testing surfaced.
- **Environment variable names are case-sensitive in Vercel — verify this
  first when live behavior doesn't match a value that "looks right."** Cost
  real debugging time twice: `DATABASE_url` (should be `DATABASE_URL`) and a
  wrong Supabase password both produced misleading downstream errors before
  being traced back to simple entry mistakes.

## Known environment constraint: this session's GitHub access is read-only

**A new session needs to know this immediately, not rediscover it.** This
Claude Code session's git credentials and the GitHub MCP tools can both read
the repo (fetch, browse files, list PRs) but **cannot push, create branches,
or merge** — every write attempt returns a 403 ("Resource not accessible by
integration"). This has been consistent all session; it's not intermittent.

**Workaround, proven repeatedly:**
1. Commit locally in-session as normal.
2. `git bundle create <path> <branch>` and send it via the file-delivery tool.
3. The user runs, from their own machine (which has real write access), one
   command at a time:
   ```
   git checkout -B main origin/main
   git pull "<path to the bundle file>" claude/money-mountain-mvp-hmami2
   git push origin main
   ```
4. Verify with `git fetch origin main` and compare SHAs before assuming the
   push landed — don't trust "done" alone.

The one-time PR (#1) was needed only because the branch didn't exist on the
remote yet; every change since has gone straight to `main` this way (no new
PRs), per the "if the PR is already merged, treat further work as fresh and
push directly" pattern.

If write access ever gets fixed, this whole section becomes obsolete — check
with a plain `git push` before assuming the workaround is still needed.

## Commits & merges

| Commit | Date | Author | What |
|---|---|---|---|
| `7a7c62e` | 2026-08-20 | cheryl-dp | Initial commit (placeholder README) |
| `c155d6b` | 2026-08-20 | Claude | Build Money Mountain MVP: AI-drafted market-sizing pipeline (full initial build, local SQLite) |
| `aa8f28b` | 2026-08-20 | Claude | Migrate storage from local SQLite to Supabase Postgres |
| `79aa817` | 2026-08-20 | Claude | Load `.env.local` for vitest, matching Next.js's own env loading |
| `efd584c` | 2026-08-21 | cheryl-dp | **Merge PR #1** (`claude/money-mountain-mvp-hmami2` → `main`) — first deployable version lands on `main` |
| `b41d2a3` | 2026-08-21 | cheryl-dp | Add `vercel.json` pinning `"framework": "nextjs"` (fixes the stale-framework-detection 404) |
| `d8dc26b` | 2026-08-21 | cheryl-dp | `maxDuration = 300` on the stage-generate route (fixes silent function-timeout hangs) |
| `d45e9a2` | 2026-08-20 | Claude | Add `NOTES.md`: auto-chain stages, surface the research pass |
| `396266e` | 2026-08-20 | Claude | Add `ARCHITECTURE.md` (rev. 1): collect/transform/output per stage |
| `00b144d` | 2026-08-20 | Claude | Revise `ARCHITECTURE.md` (rev. 2): layers as the real structural axis, after self-critique |
| `c57d75f` | 2026-08-20 | Claude | `NOTES.md` open item #3: Stage 2's TAM formula is hardcoded to a durable-goods shape |
| `ec114d2` | 2026-08-21 | Claude | Add reusable reference-data cache for Stage 2's `accounts` field |

(Dates reflect the sandbox's session clock, which may differ slightly from
wall-clock time.)

## Where to look for what

- **"Why did we choose X?"** → here.
- **"What's broken/missing that we know about?"** → `NOTES.md`.
- **"How does the system actually work?"** → `ARCHITECTURE.md` (plus the
  published diagram artifact, linked in chat history).
- **"How do I run this / what's mock vs. live mode?"** → `README.md`.
