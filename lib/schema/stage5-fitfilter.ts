import { z } from "zod";
import { DimensionDef } from "./common";

export const Stage5Input = z.object({
  category: z.string(),
  geography: z.string(),
  brand: z.string(),
  productDescription: z.string().optional(),
  fitFilterDimension: DimensionDef,
});
export type Stage5Input = z.infer<typeof Stage5Input>;

/** The third dimension is a positive/negative FILTER against the product
 * line (e.g. price/positioning cluster), not additive market size. Explicit
 * no-go zones are first-class, mirroring VAIO's "don't fight cheap-entry". */
export const FitCluster = z.object({
  id: z.string(),
  label: z.string(),
  strategicRole: z.enum(["primary", "secondary", "deprioritize"]),
  rationale: z.string(),
  competitorNote: z.string().optional(),
});
export type FitCluster = z.infer<typeof FitCluster>;

export const Stage5Output = z.object({
  clusters: z.array(FitCluster).min(1),
});
export type Stage5Output = z.infer<typeof Stage5Output>;
