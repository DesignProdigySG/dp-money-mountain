import { describe, it, expect, beforeAll } from "vitest";
import { createProject } from "../db/repo";
import { runStage, STAGE_ORDER, isStageStale, canGenerateStage } from "./stage-registry";
import { ProjectPayload } from "../schema/payload";

describe("full pipeline (mock LLM — no ANTHROPIC_API_KEY in this environment)", () => {
  let projectId: string;

  beforeAll(async () => {
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    const project = await createProject({
      category: "Enterprise laptops",
      geography: "Singapore",
      brand: "VAIO",
      productDescription: "VAIO enterprise laptop range (Pro BK/BM/PG, PK-R, SX14-R).",
    });
    projectId = project.id;
  });

  it("runs all 7 stages in order and produces a schema-valid payload", async () => {
    for (const stageId of STAGE_ORDER) {
      const { payload, stubbed } = await runStage(projectId, stageId);
      expect(stubbed).toBe(true);
      const validated = ProjectPayload.safeParse(payload);
      expect(validated.success).toBe(true);
    }
  });

  it("produces a battlefield rollup with non-empty chart and ranked table", async () => {
    const { output } = await runStage(projectId, "stage7");
    const rollup = output as { chartData: unknown[]; rankedTable: unknown[]; topPick: { label: string } };
    expect(rollup.chartData.length).toBeGreaterThan(0);
    expect(rollup.rankedTable.length).toBeGreaterThan(0);
    expect(rollup.topPick.label.length).toBeGreaterThan(0);
  });

  it("is not stale immediately after generation, and flags stale after an upstream edit", async () => {
    const { db } = await import("../db/client");
    const { projects } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(projects).where(eq(projects.id, projectId));
    let payload = ProjectPayload.parse(rows[0].payload);

    expect(isStageStale(payload, "stage2")).toBe(false);

    // Simulate a manual edit to stage1's scale dimension (upstream of stage2).
    payload = {
      ...payload,
      stage1: {
        ...payload.stage1!,
        dimensionPlan: {
          ...payload.stage1!.dimensionPlan,
          scaleDimension: {
            ...payload.stage1!.dimensionPlan.scaleDimension,
            name: "Edited scale dimension name",
          },
        },
      },
    };
    expect(isStageStale(payload, "stage2")).toBe(true);
  });

  it("reports downstream stages as not generatable until their dependencies exist", async () => {
    const fresh = await createProject({ category: "Widgets", geography: "Malaysia", brand: "Acme" });
    expect(canGenerateStage(fresh.payload, "stage1")).toBe(true);
    expect(canGenerateStage(fresh.payload, "stage2")).toBe(false);
    expect(canGenerateStage(fresh.payload, "stage6")).toBe(false);
    expect(canGenerateStage(fresh.payload, "stage7")).toBe(false);
  });
});
