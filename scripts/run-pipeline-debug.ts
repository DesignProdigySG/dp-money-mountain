/**
 * Runs the full 7-stage pipeline against LIVE Anthropic calls for a given
 * category/geography/brand, printing each stage's research findings and
 * structured output to the terminal as it happens — so you can watch the
 * model reason through the problem instead of only seeing the final
 * battlefield chart. Refuses to run in mock mode: mock always returns the
 * same canned VAIO fixture regardless of input, so it can't validate a new
 * category.
 *
 * Usage:
 *   # Full run, new project, all 7 stages:
 *   npm run pipeline:debug -- --category="..." --geography="..." --brand="..." [--product-description="..."] [--name="..."]
 *
 *   # One stage at a time, so you only pay for what you've actually reviewed:
 *   npm run pipeline:debug -- --category="..." --geography="..." --brand="..." --stage=stage1
 *     -> prints "Project <id>" at the end
 *   npm run pipeline:debug -- --project=<id> --stage=stage2
 *   npm run pipeline:debug -- --project=<id> --stage=stage3
 *   ...
 *
 *   npm run pipeline:debug -- ... | tee debug-runs/run.log
 *
 * Cost/time: 5 of 7 stages make two live Anthropic calls each (research +
 * structure), stages 6-7 make one each — 12 live API calls for a full run,
 * 1-2 for a single --stage. Plausibly several minutes for a full run, real
 * spend every time.
 */
import { loadEnv } from "vite";
for (const [key, value] of Object.entries(loadEnv("", process.cwd(), ""))) {
  if (value !== "") process.env[key] = value;
}

import { createProject, getProject } from "../lib/db/repo";
import { runStage, STAGE_ORDER } from "../lib/pipeline/stage-registry";
import { StageId } from "../lib/schema/payload";
import { getLlmClient } from "../lib/llm/factory";
import type { LlmClient, ResearchResult } from "../lib/llm/client";
import { z } from "zod";

function parseArgs() {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

function usageAndExit(): never {
  console.error(
    `Usage: npm run pipeline:debug -- --category="..." --geography="..." --brand="..." [--product-description="..."] [--name="..."] [--stage=stageN]\n` +
      `   or: npm run pipeline:debug -- --project=<id> --stage=stageN   (resume an existing project, run just one stage)`,
  );
  process.exit(1);
}

/** Wraps a live LlmClient to print research findings + structured output to
 * the terminal as each call resolves, without touching any stage module —
 * every grounded stage calls research()/structure() polymorphically through
 * this one interface. */
function withLogging(client: LlmClient, stageLabel: () => string): LlmClient {
  return {
    kind: client.kind,
    async research(args): Promise<ResearchResult> {
      const start = Date.now();
      const result = await client.research(args);
      const elapsed = Date.now() - start;
      console.log(`\n  [research] ${stageLabel()} — ${elapsed}ms`);
      console.log(`  ${result.text.split("\n").join("\n  ")}`);
      if (result.sources.length > 0) {
        console.log(`  sources:`);
        for (const src of result.sources) {
          console.log(`    - ${src.title ? `${src.title} — ` : ""}${src.url}`);
        }
      }
      return result;
    },
    async structure<T>(args: { system: string; user: string; schema: z.ZodType<T>; schemaName: string }): Promise<T> {
      const start = Date.now();
      const result = await client.structure(args);
      const elapsed = Date.now() - start;
      console.log(`\n  [structure] ${stageLabel()} — ${elapsed}ms`);
      console.log(`  ${JSON.stringify(result, null, 2).split("\n").join("\n  ")}`);
      return result;
    },
  };
}

async function main() {
  const args = parseArgs();

  let stagesToRun = STAGE_ORDER;
  if (args.stage) {
    const parsed = StageId.safeParse(args.stage);
    if (!parsed.success) {
      console.error(`--stage must be one of: ${STAGE_ORDER.join(", ")}`);
      process.exit(1);
    }
    stagesToRun = [parsed.data];
  }

  const { client, stubbed } = await getLlmClient();
  if (stubbed) {
    console.error(
      "Refusing to run in mock mode: no valid ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN found " +
        "(either unset, or the credential present failed the auth probe). Mock mode always " +
        "returns the same canned VAIO fixture regardless of input, so it can't validate a new " +
        "category — set a real key in .env.local and try again.",
    );
    process.exit(1);
  }

  let projectId: string;
  if (args.project) {
    const existing = await getProject(args.project);
    if (!existing) {
      console.error(`Project ${args.project} not found.`);
      process.exit(1);
    }
    projectId = existing.id;
    console.log(`Resuming project ${projectId}`);
  } else {
    if (!args.category || !args.geography || !args.brand) usageAndExit();
    const project = await createProject(
      {
        category: args.category,
        geography: args.geography,
        brand: args.brand,
        productDescription: args["product-description"],
      },
      args.name ?? `${args.brand} — ${args.category} — ${args.geography} (debug run)`,
    );
    projectId = project.id;
    console.log(`Created project ${projectId}`);
  }

  let currentStage = "";
  const wrapped = withLogging(client, () => currentStage);

  const overallStart = Date.now();
  for (const stageId of stagesToRun) {
    currentStage = stageId;
    console.log(`\n=== ${stageId} ===`);
    if (!stageMakesResearchCall(stageId)) {
      console.log(`  (synthesis-only stage — no research() call)`);
    }
    try {
      const { stubbed: stageStubbed } = await runStage(projectId, stageId, { client: wrapped });
      console.log(`\n  ${stageId} done${stageStubbed ? " (mock)" : ""}`);
    } catch (err) {
      console.error(`\n  ${stageId} FAILED:`);
      console.error(err);
      process.exit(1);
    }
  }
  const totalElapsed = Date.now() - overallStart;

  console.log(`\nDone in ${(totalElapsed / 1000).toFixed(1)}s. Project ${projectId}.`);
  if (stagesToRun.length < STAGE_ORDER.length) {
    console.log(`Run the next stage: npm run pipeline:debug -- --project=${projectId} --stage=<next stage>`);
  }
  console.log(`Visit /projects/${projectId}/battlefield once the dev server is running.`);
}

/** Stages 6-7 are synthesis-only (structure() calls only, confirmed by
 * reading both modules) — everything else makes a research() call first. */
function stageMakesResearchCall(stageId: string): boolean {
  return stageId !== "stage6" && stageId !== "stage7";
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
