import { z } from "zod";
import { sourcedValue } from "./common";

export const Stage2Input = z.object({
  category: z.string(),
  geography: z.string(),
  commercialQuestion: z.string(),
  scaleDimension: z.object({
    name: z.string(),
    values: z.array(z.object({ id: z.string(), label: z.string() })),
    canonicalKey: z.string().optional(),
  }),
});
export type Stage2Input = z.infer<typeof Stage2Input>;

/** Every fact here comes from the LLM; `annualizedDemand` is computed by
 * application code from the other four fields, never asked of the model. */
export const BottomUpRow = z.object({
  scaleValueId: z.string(),
  accounts: sourcedValue(z.number()),
  avgUnitsPerAccount: sourcedValue(z.number()),
  penetration: sourcedValue(z.number()),
  cycleYears: sourcedValue(z.number()),
});
export type BottomUpRow = z.infer<typeof BottomUpRow>;

export const BottomUpRowComputed = BottomUpRow.extend({
  annualizedDemand: z.number(),
});
export type BottomUpRowComputed = z.infer<typeof BottomUpRowComputed>;

export const Stage2LlmOutput = z.object({
  topDown: z.object({
    benchmark: sourcedValue(z.number()),
    basisNote: z.string(),
  }),
  bottomUpRows: z.array(BottomUpRow).min(1),
});
export type Stage2LlmOutput = z.infer<typeof Stage2LlmOutput>;

export const Stage2Output = z.object({
  topDown: z.object({
    benchmark: sourcedValue(z.number()),
    basisNote: z.string(),
  }),
  bottomUp: z.object({
    rows: z.array(BottomUpRowComputed).min(1),
    totalAnnualizedDemand: z.number(),
  }),
  reconciliation: z.object({
    deltaVsTopDown: z.number(),
    deltaPct: z.number(),
    note: z.string(),
  }),
});
export type Stage2Output = z.infer<typeof Stage2Output>;
