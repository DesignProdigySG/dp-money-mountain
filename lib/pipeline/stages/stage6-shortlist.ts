import type { StageDefinition } from "../types";
import { Stage6Input, Stage6Output } from "../../schema/stage6-shortlist";
import { METHODOLOGY_PREAMBLE } from "../prompts";
import type { ProjectPayload } from "../../schema/payload";

export const stage6Shortlist: StageDefinition<Stage6Input, Stage6Output> = {
  id: "stage6",
  title: "Shortlist",
  dependsOn: ["stage1", "stage3", "stage4", "stage5"],
  outputSchema: Stage6Output,
  buildInput(payload: ProjectPayload) {
    if (!payload.stage1 || !payload.stage3 || !payload.stage4 || !payload.stage5) return null;
    const { scaleDimension, profileDimension } = payload.stage1.dimensionPlan;
    return Stage6Input.parse({
      category: payload.intake.category,
      geography: payload.intake.geography,
      scaleDimension: { name: scaleDimension.name, values: scaleDimension.values.map((v) => ({ id: v.id, label: v.label })) },
      profileDimension: { name: profileDimension.name, values: profileDimension.values.map((v) => ({ id: v.id, label: v.label })) },
      matrixCells: payload.stage3.cells.map((c) => ({
        scaleValueId: c.scaleValueId,
        profileValueId: c.profileValueId,
        count: c.count.value,
      })),
      profileMappings: payload.stage4.profileMappings.map((m) => ({
        profileValueId: m.profileValueId,
        workloadProfile: m.workloadProfile,
        dominantNeedCategoryId: m.dominantNeedCategoryId,
        intensity: m.intensity,
      })),
      needCategoryNames: payload.stage4.needsFramework.map((n) => ({ id: n.id, name: n.name, productFit: n.productFit })),
      fitClusters: payload.stage5.clusters.map((c) => ({ id: c.id, label: c.label, strategicRole: c.strategicRole })),
    });
  },
  async run(input, llm) {
    const system = METHODOLOGY_PREAMBLE;
    const user = `Category: ${input.category}
Geography: ${input.geography}

Scale dimension "${input.scaleDimension.name}": ${JSON.stringify(input.scaleDimension.values)}
Profile dimension "${input.profileDimension.name}": ${JSON.stringify(input.profileDimension.values)}
Modeled account matrix (scaleValueId x profileValueId -> count): ${JSON.stringify(input.matrixCells)}
Profile -> workload/need mapping: ${JSON.stringify(input.profileMappings)}
Need categories: ${JSON.stringify(input.needCategoryNames)}
Fit-filter clusters (strategic role): ${JSON.stringify(input.fitClusters)}

Step 6 of the funnel: rank scale x profile segments into tiers — "top"
(validate first), "watchlist" (worth tracking), or "trap" (looks big but
should not be first attack, e.g. because the workforce is frontline-heavy or
the account pool is misleading). For each segment in top/watchlist, give the
modeled account count, a fleet-scale proxy description, intensity, dominant
need, a fit hypothesis referencing a "primary" or "secondary" fit cluster
where applicable, why it's attractive, the main risk, and a concrete next
field question to validate. Do not rank by account-pool size alone — combine
account pool with fit quality. Optionally cross-check the ranking against an
alternate "winnability" framing and note whether the two converge.`;

    const structured = await llm.structure({
      system,
      user,
      schema: Stage6Output,
      schemaName: "stage6",
    });
    return structured;
  },
  merge(payload, output) {
    return { ...payload, stage6: output };
  },
};
