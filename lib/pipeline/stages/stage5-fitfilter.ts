import type { StageDefinition } from "../types";
import { Stage5Input, Stage5Output } from "../../schema/stage5-fitfilter";
import { METHODOLOGY_PREAMBLE } from "../prompts";
import type { ProjectPayload } from "../../schema/payload";

export const stage5FitFilter: StageDefinition<Stage5Input, Stage5Output> = {
  id: "stage5",
  title: "Pricing / Positioning Filter",
  dependsOn: ["stage1"],
  outputSchema: Stage5Output,
  buildInput(payload: ProjectPayload) {
    if (!payload.stage1) return null;
    return Stage5Input.parse({
      category: payload.intake.category,
      geography: payload.intake.geography,
      brand: payload.intake.brand,
      productDescription: payload.intake.productDescription,
      fitFilterDimension: payload.stage1.dimensionPlan.fitFilterDimension,
    });
  },
  async run(input, llm) {
    const system = METHODOLOGY_PREAMBLE;
    const user = `Category: ${input.category}
Geography: ${input.geography}
Brand / product: ${input.brand}
${input.productDescription ? `Product description: ${input.productDescription}` : ""}
Fit-filter dimension "${input.fitFilterDimension.name}": ${input.fitFilterDimension.values.map((v) => v.label).join(", ")}

Step 5 of the funnel: this dimension is a POSITIVE/NEGATIVE FILTER against
the brand's product line, not additive market size. For each value, decide
a strategic role — "primary" (this is the real battlefield), "secondary"
(a real but smaller opportunity), or "deprioritize" (explicit no-go zone,
even if it looks large) — with a rationale and, where relevant, a note on
who the realistic competitors are in that cluster.`;

    const research = await llm.research({ system, user });
    const structured = await llm.structure({
      system,
      user: `${user}\n\nResearch notes:\n${research.text}`,
      schema: Stage5Output,
      schemaName: "stage5",
    });
    return structured;
  },
  merge(payload, output) {
    return { ...payload, stage5: output };
  },
};
