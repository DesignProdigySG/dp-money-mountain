import { z } from "zod";
import { sourcedValue, DimensionValue } from "./common";

/**
 * A cached, geography-scoped population fact — e.g. "number of Singapore
 * businesses by employee-size band." Reused across projects that declare a
 * matching canonicalKey on a dimension, instead of re-researching a fact
 * that's the same regardless of category. See lib/pipeline/reference-data.ts.
 */
export const ReferenceDataset = z.object({
  canonicalKey: z.string(),
  geography: z.string(),
  dimensionName: z.string(),
  description: z.string().optional(),
  bandValues: z.array(DimensionValue).min(1),
  accounts: z.record(z.string(), sourcedValue(z.number())),
  asOfDate: z.string().optional(),
  sourceNote: z.string().optional(),
});
export type ReferenceDataset = z.infer<typeof ReferenceDataset>;
