import type { StageDefinition } from "../types";
import { Stage4Input, Stage4Output } from "../../schema/stage4-needs";
import { METHODOLOGY_PREAMBLE } from "../prompts";
import type { ProjectPayload } from "../../schema/payload";

export const stage4Needs: StageDefinition<Stage4Input, Stage4Output> = {
  id: "stage4",
  title: "Needs & Fit",
  dependsOn: ["stage1"],
  outputSchema: Stage4Output,
  buildInput(payload: ProjectPayload) {
    if (!payload.stage1) return null;
    const { profileDimension } = payload.stage1.dimensionPlan;
    return Stage4Input.parse({
      category: payload.intake.category,
      geography: payload.intake.geography,
      brand: payload.intake.brand,
      productDescription: payload.intake.productDescription,
      profileDimension: { name: profileDimension.name, values: profileDimension.values.map((v) => ({ id: v.id, label: v.label })) },
    });
  },
  async run(input, llm) {
    const system = METHODOLOGY_PREAMBLE;
    const user = `Category: ${input.category}
Geography: ${input.geography}
Brand / product: ${input.brand}
${input.productDescription ? `Product description: ${input.productDescription}` : ""}
Profile dimension "${input.profileDimension.name}": ${input.profileDimension.values.map((v) => v.label).join(", ")}

Step 4 of the funnel: first define a reusable, vendor-independent needs
framework for this category (need categories, typical users, hardware/
selection requirements, then THIS brand's fit + hard exclusions for each —
base the framework on independent industry guidance, not on the brand).
Then, for EACH profile-dimension value, infer the dominant workforce/
workload pattern and map it to one dominant need category (plus an optional
secondary need), with an intensity (low/medium/high) and confidence.`;

    const research = await llm.research({ system, user });
    const structured = await llm.structure({
      system,
      user: `${user}\n\nResearch notes:\n${research.text}`,
      schema: Stage4Output,
      schemaName: "stage4",
    });
    return structured;
  },
  merge(payload, output) {
    return { ...payload, stage4: output };
  },
};
