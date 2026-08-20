# Architecture: layers, not just steps

*Rev. 2.* Rev. 1 colored all seven business stages the same way and called that
"data engineering." It wasn't — it was a flowchart of product steps. This version
treats extract / transform / validate / load / serve as the actual structural
axis, and the seven stages as what they are: one orchestration sequence running
that same shape seven times, chained by state. Also published as an interactive
diagram (link shared in chat).

## 1. The canonical shape, run seven times

Every stage — framing, TAM, segmentation, needs, pricing, shortlist, rollup —
passes through the same six layers. What differs between them is only the
content of the extract/transform calls. Orchestration is what chains them:
stage N's Load output becomes stage N+1's Extract input by re-reading the
shared payload — there's no message queue or event bus, it's a synchronous
HTTP call per stage, with no automatic retry.

```mermaid
flowchart TD
    trigger["manual UI click -> synchronous HTTP request\nno queue - no scheduler - no auto-retry"]:::control
    extract["EXTRACT\nweb_search research call (+ intake form, stage 1 only)\nalso reads prior stages' payload fields"]:::source
    transform_llm["TRANSFORM\nllm.structure() - no tools, forced schema"]:::llm
    transform_code["TRANSFORM\ncode: ipf.ts / reconcile() - not the model"]:::deterministic
    validate{{"VALIDATE\nZod.parse() - schema gate"}}:::gate
    fail["fail -> throw, write error row, stop"]:::gapnode
    runs[("stage_runs\nimmutable - append-only\none row per attempt")]:::sink
    payload[("projects.payload\nmutable - last-write-wins\nconcurrent writes: unhandled")]:::sink
    serve["SERVE\nBattlefield page reads projects.payload"]:::sink

    trigger --> extract --> transform_llm --> transform_code --> validate
    validate -- pass --> runs
    validate -- pass --> payload
    validate -- fail --> fail
    payload --> serve

    subgraph orchestration ["ORCHESTRATION - 7 iterations, chained by state"]
        direction TB
        s1["S1 - Framing & Dimensions"]:::control
        s2["S2 - TAM"]:::control
        s3["S3 - Segment Matrix"]:::control
        s4["S4 - Needs & Fit"]:::control
        s5["S5 - Pricing Filter"]:::control
        s6["S6 - Shortlist"]:::control
        s7["S7 - Rollup"]:::control
        s1 --> s2 --> s3 --> s4 --> s5 --> s6 --> s7
    end

    orchestration -. "each iteration enters at TRIGGER" .-> trigger
    payload -. "stage N's Load feeds stage N+1's Extract" .-> orchestration

    classDef control fill:#e6e9f0,stroke:#47536b,color:#14181f
    classDef source fill:#e8effc,stroke:#2d6cdf,color:#14181f
    classDef llm fill:#fbf1de,stroke:#a8721c,color:#14181f
    classDef deterministic fill:#e7f4ec,stroke:#2f7a52,color:#14181f
    classDef gate fill:#e7f4ec,stroke:#2f7a52,color:#14181f
    classDef sink fill:#f1ecfa,stroke:#6a49aa,color:#14181f
    classDef gapnode fill:#fbeae8,stroke:#b03d31,color:#14181f
```

The one visual exception to "same shape every time": stage 3 adds a second
deterministic transform (`ipf.ts`, the matrix-fill), and stages that don't need
grounding (6, 7) skip the Extract layer's web-search sub-step — they transform
straight from payload state.

## 2. Anatomy of one stage, with the gates made explicit

Same TAM example as rev. 1, corrected: schema validation is now its own gate
rather than a caption, and the two storage nodes are labeled with their actual
consistency properties instead of just "where it's saved."

```mermaid
flowchart TD
    upstream["stage1.dimensionPlan"]:::source
    input["Stage2Input"]:::neutral
    research["llm.research()  [EXTRACT]\nAnthropic + web_search — live internet"]:::source
    found["research findings"]:::neutral
    discarded["discarded — Gap #2\nnever written anywhere"]:::gapnode
    structure["llm.structure()  [TRANSFORM]\nno tools — forced schema: Stage2LlmOutput"]:::llm
    gate1{{"Zod.parse()"}}:::gate
    reconcile["reconcile()  [TRANSFORM — plain code]\nannualizedDemand per row · delta vs top-down"]:::deterministic
    gate2{{"Zod.parse()"}}:::gate
    runs[("stage_runs row\nimmutable — append-only, one row/attempt")]:::sink
    payload[("projects.payload\nmutable — last-write-wins\nconcurrent writes: unhandled")]:::sink

    upstream -- "buildInput()" --> input --> research
    research -- "research.text + sources[]" --> found
    found -.-> discarded
    found --> structure --> gate1 --> reconcile --> gate2
    gate2 -- "merge()" --> runs
    gate2 -- "merge()" --> payload

    classDef source fill:#e8effc,stroke:#2d6cdf,color:#14181f
    classDef llm fill:#fbf1de,stroke:#a8721c,color:#14181f
    classDef deterministic fill:#e7f4ec,stroke:#2f7a52,color:#14181f
    classDef gate fill:#e7f4ec,stroke:#2f7a52,color:#14181f
    classDef sink fill:#f1ecfa,stroke:#6a49aa,color:#14181f
    classDef gapnode fill:#fbeae8,stroke:#b03d31,color:#14181f,stroke-dasharray: 3 3
    classDef neutral fill:#eef0f4,stroke:#d8dce3,color:#14181f
```

Every field written into `Stage2Output` is also a `sourcedValue` — tagged
`sourced`, `modeled`, or `assumed`, plus an optional URL — a data-quality
dimension orthogonal to the schema-shape validation the two gates above
enforce.

## 3. Change detection: how a stage knows it's stale

The one mechanism in this system that's genuinely a data-engineering pattern in
its own right — content-hash-based staleness detection, the same idea behind
CDC watermarking or dbt's state comparison, just not wired to auto-recompute yet.

```mermaid
flowchart LR
    payload["current payload\nbuildInput(payload)"]:::neutral
    hash["hashInput()"]:::deterministic
    inputHash["inputHash\n(this instant)"]:::neutral
    stored[("stageMeta[id].generatedFromInputHash\nstored from the last successful run")]:::sink
    compare{{"equal?"}}:::control
    fresh["fresh — no badge"]:::deterministic
    stale["stale badge shown — not auto-rerun"]:::gapnode

    payload --> hash --> inputHash --> compare
    stored --> compare
    compare -- yes --> fresh
    compare -- no --> stale

    classDef neutral fill:#eef0f4,stroke:#d8dce3,color:#14181f
    classDef deterministic fill:#e7f4ec,stroke:#2f7a52,color:#14181f
    classDef sink fill:#f1ecfa,stroke:#6a49aa,color:#14181f
    classDef control fill:#e6e9f0,stroke:#47536b,color:#14181f
    classDef gapnode fill:#fbeae8,stroke:#b03d31,color:#14181f
```

This is a real, deliberate incremental-recompute mechanism — but the last step
is manual today: a stale badge tells the user something upstream changed, it
doesn't trigger recomputation itself. That's part of Gap #1.

## 4. Collect / Transform / Output, in one dictionary

**Extract** — what's ingested
- `intake` form — category, geography, brand, description (stage 1 only)
- `llm.research()` — live web search per grounded stage (1–6)
- upstream `ProjectPayload` fields — every stage's `buildInput()`

**Transform / Validate** — how it's processed
- `llm.structure()` — forces findings into a Zod schema, no tools
- `ipf.ts` / `reconcile()` — deterministic code, not the model
- `Zod.parse()` — schema gate, twice per grounded stage
- `sourcedValue` tagging — sourced / modeled / assumed on every fact
- `hashInput()` — content hash feeding staleness detection

**Load / Serve** — where it lands
- `money_mountain.stage_runs` — immutable, append-only, one row/attempt
- `money_mountain.projects.payload` — mutable, last-write-wins, concurrent writes unhandled
- Battlefield page — bar chart, top pick, ranked table, the user-facing consumer

## Known gaps

See `NOTES.md` for full detail. Summary:

1. **No auto-chain** — orchestration is a manual click per stage, and staleness
   detection (§3) surfaces a badge but doesn't trigger recomputation.
   Deliberate for the MVP (let us debug the DB/framework/timeout issues one
   stage at a time), but the end state is one input running all 7 iterations
   without manual clicks in between.
2. **The research pass is invisible** — `research.text` and its sources feed
   `structure()` and are then discarded, never written to `stage_runs`, never
   shown in the UI. Marked directly on diagram §2 above.

---
*Rev. 2, 2026-08-20 — revised after self-critique against actual data-engineering
conventions. Reflects the shipped pipeline after the first live Anthropic run.*
