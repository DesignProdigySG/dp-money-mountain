import type { StageDefinition } from "../types";
import { Stage1Input, Stage1Output } from "../../schema/stage1-framing";
import { METHODOLOGY_PREAMBLE } from "../prompts";
import type { ProjectPayload } from "../../schema/payload";

export const stage1Framing: StageDefinition<Stage1Input, Stage1Output> = {
  id: "stage1",
  title: "Framing & Dimensions",
  dependsOn: [],
  outputSchema: Stage1Output,
  buildInput(payload: ProjectPayload) {
    return Stage1Input.parse({
      category: payload.intake.category,
      geography: payload.intake.geography,
      brand: payload.intake.brand,
      productDescription: payload.intake.productDescription,
    });
  },
  async run(input, llm) {
    const system = METHODOLOGY_PREAMBLE;
    const user = `Category: ${input.category}
Geography: ${input.geography}
Brand / product: ${input.brand}
${input.productDescription ? `Product description: ${input.productDescription}` : ""}

Step 1 of the funnel: frame the commercial question this analysis answers
(e.g. "is this category worth pursuing, and where"), and decide the three
dimensions for the rest of the analysis: the scale dimension (proxy for
deal/fleet size), the profile dimension (predicts dominant buyer need), and
the fit-filter dimension (price/positioning tiers this brand can win or
must avoid). Research real public data for this category and geography to
ground the dimension choice and value counts where possible.`;

    const research = await llm.research({ system, user });
    const structured = await llm.structure({
      system,
      user: `${user}\n\nResearch notes:\n${research.text}\n\nSources found: ${research.sources
        .map((s) => s.url)
        .join(", ")}`,
      schema: Stage1Output,
      schemaName: "stage1",
    });
    return structured;
  },
  merge(payload, output) {
    return { ...payload, stage1: output };
  },
};
