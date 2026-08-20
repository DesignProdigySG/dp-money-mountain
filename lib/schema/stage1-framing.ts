import { z } from "zod";
import { DimensionDef } from "./common";

export const Stage1Input = z.object({
  category: z.string(),
  geography: z.string(),
  brand: z.string(),
  productDescription: z.string().optional(),
});
export type Stage1Input = z.infer<typeof Stage1Input>;

export const Stage1Output = z.object({
  framing: z.object({
    commercialQuestion: z.string(),
    narrative: z.string(),
  }),
  dimensionPlan: z.object({
    scaleDimension: DimensionDef,
    profileDimension: DimensionDef,
    fitFilterDimension: DimensionDef,
  }),
});
export type Stage1Output = z.infer<typeof Stage1Output>;
