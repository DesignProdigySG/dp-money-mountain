import { z } from "zod";
import { Confidence, sourcedValue } from "./common";

export const Stage4Input = z.object({
  category: z.string(),
  geography: z.string(),
  brand: z.string(),
  productDescription: z.string().optional(),
  profileDimension: z.object({
    name: z.string(),
    values: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
});
export type Stage4Input = z.infer<typeof Stage4Input>;

/** A reusable, vendor-independent needs taxonomy (users -> requirements),
 * mapped separately to this brand's fit. Mirrors the "Laptop Needs Map"
 * pattern: the framework itself doesn't mention the brand. */
export const NeedCategory = z.object({
  id: z.string(),
  name: z.string(),
  typicalUsers: z.string(),
  requirements: z.string(),
  productFit: z.string(),
  hardExclusions: z.string().optional(),
  source: sourcedValue(z.string()).optional(),
});
export type NeedCategory = z.infer<typeof NeedCategory>;

export const ProfileWorkloadMapping = z.object({
  profileValueId: z.string(),
  workloadProfile: z.string(),
  dominantNeedCategoryId: z.string(),
  intensity: z.enum(["low", "medium", "high"]),
  secondaryNeed: z.string().optional(),
  confidence: Confidence,
  notes: z.string().optional(),
});
export type ProfileWorkloadMapping = z.infer<typeof ProfileWorkloadMapping>;

export const Stage4Output = z.object({
  needsFramework: z.array(NeedCategory).min(1),
  profileMappings: z.array(ProfileWorkloadMapping).min(1),
});
export type Stage4Output = z.infer<typeof Stage4Output>;
