import type { StageDefinition } from "../types";
import { Stage7Input, Stage7Output } from "../../schema/stage7-rollup";
import { METHODOLOGY_PREAMBLE } from "../prompts";
import type { ProjectPayload } from "../../schema/payload";

export const stage7Rollup: StageDefinition<Stage7Input, Stage7Output> = {
  id: "stage7",
  title: "Battlefield",
  dependsOn: ["stage1", "stage2", "stage6"],
  outputSchema: Stage7Output,
  buildInput(payload: ProjectPayload) {
    if (!payload.stage1 || !payload.stage2 || !payload.stage6) return null;
    const { scaleDimension, profileDimension } = payload.stage1.dimensionPlan;
    const scaleLabel = (id: string) => scaleDimension.values.find((v) => v.id === id)?.label ?? id;
    const profileLabel = (id: string) => profileDimension.values.find((v) => v.id === id)?.label ?? id;
    const fitLabel = (id?: string) => (id ? payload.stage5?.clusters.find((c) => c.id === id)?.label : undefined);

    const topSegments = payload.stage6.segments
      .filter((s) => s.tier === "top")
      .map((s) => ({
        scaleValueId: s.scaleValueId,
        profileValueId: s.profileValueId,
        profileLabel: profileLabel(s.profileValueId),
        scaleLabel: scaleLabel(s.scaleValueId),
        fitClusterLabel: fitLabel(s.fitClusterId),
        tier: s.tier,
        modeledAccounts: s.modeledAccounts,
        whyAttractive: s.whyAttractive,
        mainRisk: s.mainRisk,
        fitHypothesis: s.fitHypothesis,
      }));

    return Stage7Input.parse({
      category: payload.intake.category,
      geography: payload.intake.geography,
      brand: payload.intake.brand,
      scaleDimension: { name: scaleDimension.name, values: scaleDimension.values.map((v) => ({ id: v.id, label: v.label })) },
      bottomUpRows: payload.stage2.bottomUp.rows.map((r) => ({ scaleValueId: r.scaleValueId, annualizedDemand: r.annualizedDemand })),
      topSegments,
    });
  },
  async run(input, llm) {
    const system = METHODOLOGY_PREAMBLE;
    const user = `Category: ${input.category}
Geography: ${input.geography}
Brand / product: ${input.brand}

Scale dimension "${input.scaleDimension.name}" values: ${JSON.stringify(input.scaleDimension.values)}
Annualized demand by scale value (bottom-up): ${JSON.stringify(input.bottomUpRows)}
Top-tier shortlisted segments: ${JSON.stringify(input.topSegments)}

Step 7 of the funnel — the executive rollup, the direct answer to "which
mountain should we focus on?": For chartData, produce one row per
scale-dimension value: split its annualizedDemand into "currentPick" (the
portion attributable to the #1 shortlisted segment's scale value) vs
"other". Pick ONE top segment overall with a 3-5 bullet rationale. Produce a
ranked table of the top 3-5 segment hypotheses (rank, label, account pool,
why it rises, main risk, status). Finish with 3-5 short bullets on what
concrete evidence would change this answer (promote or demote a candidate).`;

    const structured = await llm.structure({
      system,
      user,
      schema: Stage7Output,
      schemaName: "stage7",
    });
    return structured;
  },
  merge(payload, output) {
    return { ...payload, stage7: output };
  },
};
