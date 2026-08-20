import type { StageDefinition } from "../types";
import { Stage2Input, Stage2LlmOutput, Stage2Output, BottomUpRowComputed } from "../../schema/stage2-tam";
import { METHODOLOGY_PREAMBLE } from "../prompts";
import type { ProjectPayload } from "../../schema/payload";

export const stage2Tam: StageDefinition<Stage2Input, Stage2Output> = {
  id: "stage2",
  title: "TAM",
  dependsOn: ["stage1"],
  outputSchema: Stage2Output,
  buildInput(payload: ProjectPayload) {
    if (!payload.stage1) return null;
    return Stage2Input.parse({
      category: payload.intake.category,
      geography: payload.intake.geography,
      commercialQuestion: payload.stage1.framing.commercialQuestion,
      scaleDimension: {
        name: payload.stage1.dimensionPlan.scaleDimension.name,
        values: payload.stage1.dimensionPlan.scaleDimension.values.map((v) => ({ id: v.id, label: v.label })),
      },
    });
  },
  async run(input, llm) {
    const system = METHODOLOGY_PREAMBLE;
    const user = `Category: ${input.category}
Geography: ${input.geography}
Commercial question: ${input.commercialQuestion}
Scale dimension "${input.scaleDimension.name}" values: ${input.scaleDimension.values
      .map((v) => v.label)
      .join(", ")}

Step 2 of the funnel: build the TAM. First, a top-down benchmark for total
annual demand in this category/geography from public/industry sources
(rough anchor, tag its evidence status honestly). Second, an independent
bottom-up build: for EACH scale-dimension value, estimate accounts (or
equivalent unit count), avg units-per-account, penetration (0-1), and
replacement/purchase cycle in years. Do not compute annualizedDemand
yourself — just supply the four inputs per row, sourced/modeled/assumed.`;

    const research = await llm.research({ system, user });
    const llmOutput = await llm.structure({
      system,
      user: `${user}\n\nResearch notes:\n${research.text}`,
      schema: Stage2LlmOutput,
      schemaName: "stage2-llm",
    });

    const rows: BottomUpRowComputed[] = llmOutput.bottomUpRows.map((row) => {
      const employees = row.accounts.value * row.avgUnitsPerAccount.value;
      const installed = employees * row.penetration.value;
      const annualizedDemand = row.cycleYears.value > 0 ? installed / row.cycleYears.value : 0;
      return { ...row, annualizedDemand };
    });
    const totalAnnualizedDemand = rows.reduce((sum, r) => sum + r.annualizedDemand, 0);
    const deltaVsTopDown = totalAnnualizedDemand - llmOutput.topDown.benchmark.value;
    const deltaPct = llmOutput.topDown.benchmark.value !== 0 ? deltaVsTopDown / llmOutput.topDown.benchmark.value : 0;

    return Stage2Output.parse({
      topDown: llmOutput.topDown,
      bottomUp: { rows, totalAnnualizedDemand },
      reconciliation: {
        deltaVsTopDown,
        deltaPct,
        note: `Bottom-up total is ${(deltaPct * 100).toFixed(1)}% ${deltaVsTopDown >= 0 ? "above" : "below"} the top-down benchmark. Not forced to zero — a hypothesis model, not precision engineering.`,
      },
    });
  },
  merge(payload, output) {
    return { ...payload, stage2: output };
  },
};
