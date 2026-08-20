import { z } from "zod";
import { sourcedValue } from "./common";

export const Stage3Input = z.object({
  category: z.string(),
  geography: z.string(),
  scaleDimension: z.object({
    name: z.string(),
    values: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
  profileDimension: z.object({
    name: z.string(),
    description: z.string().optional(),
    values: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
});
export type Stage3Input = z.infer<typeof Stage3Input>;

/** LLM supplies sourced row/column totals (+ optional relative skew weights
 * per cell). Interior cells are then filled deterministically by
 * `lib/pipeline/ipf.ts`, not by the model — see Stage3Output. */
export const Stage3LlmOutput = z.object({
  scaleRowTotals: z.array(
    z.object({ scaleValueId: z.string(), total: sourcedValue(z.number()) }),
  ).min(1),
  profileColTotals: z.array(
    z.object({ profileValueId: z.string(), total: sourcedValue(z.number()) }),
  ).min(1),
  skewNotes: z.array(
    z.object({
      profileValueId: z.string(),
      note: z.string(),
    }),
  ).optional(),
  reconciliationNotes: z.array(z.string()).optional(),
});
export type Stage3LlmOutput = z.infer<typeof Stage3LlmOutput>;

export const MatrixCell = z.object({
  scaleValueId: z.string(),
  profileValueId: z.string(),
  count: sourcedValue(z.number()),
});
export type MatrixCell = z.infer<typeof MatrixCell>;

export const Stage3Output = z.object({
  cells: z.array(MatrixCell),
  scaleRowTotals: z.array(
    z.object({ scaleValueId: z.string(), total: sourcedValue(z.number()) }),
  ),
  profileColTotals: z.array(
    z.object({ profileValueId: z.string(), total: sourcedValue(z.number()) }),
  ),
  reconciliationNotes: z.array(z.string()),
  ipfConverged: z.boolean(),
});
export type Stage3Output = z.infer<typeof Stage3Output>;
