import type { StageDefinition } from "../types";
import { Stage3Input, Stage3LlmOutput, Stage3Output, MatrixCell } from "../../schema/stage3-segmentation";
import { METHODOLOGY_PREAMBLE } from "../prompts";
import { iterativeProportionalFit } from "../ipf";
import type { ProjectPayload } from "../../schema/payload";

export const stage3Segmentation: StageDefinition<Stage3Input, Stage3Output> = {
  id: "stage3",
  title: "Segment Matrix",
  dependsOn: ["stage1"],
  outputSchema: Stage3Output,
  buildInput(payload: ProjectPayload) {
    if (!payload.stage1) return null;
    const { scaleDimension, profileDimension } = payload.stage1.dimensionPlan;
    return Stage3Input.parse({
      category: payload.intake.category,
      geography: payload.intake.geography,
      scaleDimension: { name: scaleDimension.name, values: scaleDimension.values.map((v) => ({ id: v.id, label: v.label })) },
      profileDimension: {
        name: profileDimension.name,
        description: profileDimension.description,
        values: profileDimension.values.map((v) => ({ id: v.id, label: v.label })),
      },
    });
  },
  async run(input, llm) {
    const system = METHODOLOGY_PREAMBLE;
    const user = `Category: ${input.category}
Geography: ${input.geography}
Scale dimension "${input.scaleDimension.name}": ${input.scaleDimension.values.map((v) => v.label).join(", ")}
Profile dimension "${input.profileDimension.name}"${input.profileDimension.description ? ` (${input.profileDimension.description})` : ""}: ${input.profileDimension.values
      .map((v) => v.label)
      .join(", ")}

Step 3 of the funnel: build a 2-D account-count matrix crossing these two
dimensions for resolution. You do NOT need to estimate every interior cell
— supply sourced/modeled row totals (per scale value) and column totals
(per profile value) from public data where possible, plus a short
qualitative skew note per profile value if some scale bands are clearly
over/under-represented for it. Interior cells will be filled deterministically
from your totals. Also note any reconciliation gaps openly rather than
forcing totals to match exactly.`;

    const research = await llm.research({ system, user });
    const llmOutput = await llm.structure({
      system,
      user: `${user}\n\nResearch notes:\n${research.text}`,
      schema: Stage3LlmOutput,
      schemaName: "stage3-llm",
    });

    const rowIds = input.scaleDimension.values.map((v) => v.id);
    const colIds = input.profileDimension.values.map((v) => v.id);
    const rowTotals = rowIds.map(
      (id) => llmOutput.scaleRowTotals.find((r) => r.scaleValueId === id)?.total.value ?? 0,
    );
    const colTotals = colIds.map(
      (id) => llmOutput.profileColTotals.find((c) => c.profileValueId === id)?.total.value ?? 0,
    );

    const ipf = iterativeProportionalFit({ rowIds, rowTotals, colIds, colTotals });

    const cells: MatrixCell[] = [];
    for (let i = 0; i < rowIds.length; i++) {
      for (let j = 0; j < colIds.length; j++) {
        cells.push({
          scaleValueId: rowIds[i],
          profileValueId: colIds[j],
          count: { value: Math.round(ipf.matrix[i][j]), status: "modeled", sourceNote: "Filled by iterative proportional fitting from sourced row/column totals." },
        });
      }
    }

    const profileLabel = (id: string) => input.profileDimension.values.find((v) => v.id === id)?.label ?? id;
    const reconciliationNotes = [
      ...(llmOutput.reconciliationNotes ?? []),
      ...(llmOutput.skewNotes ?? []).map((s) => `${profileLabel(s.profileValueId)}: ${s.note}`),
      ipf.converged
        ? `IPF converged in ${ipf.iterations} iterations.`
        : `IPF did not fully converge after ${ipf.iterations} iterations — row/column totals are approximate.`,
    ];

    return Stage3Output.parse({
      cells,
      scaleRowTotals: llmOutput.scaleRowTotals,
      profileColTotals: llmOutput.profileColTotals,
      reconciliationNotes,
      ipfConverged: ipf.converged,
    });
  },
  merge(payload, output) {
    return { ...payload, stage3: output };
  },
};
