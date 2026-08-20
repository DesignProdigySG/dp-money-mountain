import { z } from "zod";

export const Stage6Input = z.object({
  category: z.string(),
  geography: z.string(),
  scaleDimension: z.object({
    name: z.string(),
    values: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
  profileDimension: z.object({
    name: z.string(),
    values: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
  matrixCells: z.array(
    z.object({ scaleValueId: z.string(), profileValueId: z.string(), count: z.number() }),
  ),
  profileMappings: z.array(
    z.object({
      profileValueId: z.string(),
      workloadProfile: z.string(),
      dominantNeedCategoryId: z.string(),
      intensity: z.enum(["low", "medium", "high"]),
    }),
  ),
  needCategoryNames: z.array(z.object({ id: z.string(), name: z.string(), productFit: z.string() })),
  fitClusters: z.array(
    z.object({ id: z.string(), label: z.string(), strategicRole: z.enum(["primary", "secondary", "deprioritize"]) }),
  ),
});
export type Stage6Input = z.infer<typeof Stage6Input>;

export const ShortlistSegment = z.object({
  scaleValueId: z.string(),
  profileValueId: z.string(),
  fitClusterId: z.string().optional(),
  tier: z.enum(["top", "watchlist", "trap"]),
  priority: z.number().optional(),
  modeledAccounts: z.number(),
  fleetScaleProxy: z.string(),
  intensity: z.enum(["low", "medium", "high"]),
  dominantNeed: z.string(),
  fitHypothesis: z.string(),
  whyAttractive: z.string(),
  mainRisk: z.string(),
  nextFieldQuestion: z.string(),
});
export type ShortlistSegment = z.infer<typeof ShortlistSegment>;

export const Stage6Output = z.object({
  segments: z.array(ShortlistSegment).min(1),
  winnabilityCrossCheck: z.string().optional(),
});
export type Stage6Output = z.infer<typeof Stage6Output>;
