import { z } from "zod";

export const Stage7Input = z.object({
  category: z.string(),
  geography: z.string(),
  brand: z.string(),
  scaleDimension: z.object({
    name: z.string(),
    values: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
  bottomUpRows: z.array(z.object({ scaleValueId: z.string(), annualizedDemand: z.number() })),
  topSegments: z.array(
    z.object({
      scaleValueId: z.string(),
      profileValueId: z.string(),
      profileLabel: z.string(),
      scaleLabel: z.string(),
      fitClusterLabel: z.string().optional(),
      tier: z.enum(["top", "watchlist", "trap"]),
      modeledAccounts: z.number(),
      whyAttractive: z.string(),
      mainRisk: z.string(),
      fitHypothesis: z.string(),
    }),
  ),
});
export type Stage7Input = z.infer<typeof Stage7Input>;

/** The payoff screen: chartData splits each scale-dimension band's
 * annualized demand into "currentPick" (the segment(s) forming the #1
 * hypothesis) vs "other" — the bar-chart "mountain" itself. */
export const Stage7Output = z.object({
  chartData: z.array(
    z.object({ scaleValueId: z.string(), label: z.string(), currentPick: z.number(), other: z.number() }),
  ).min(1),
  topPick: z.object({
    label: z.string(),
    rationale: z.array(z.string()).min(1),
  }),
  rankedTable: z.array(
    z.object({
      rank: z.number(),
      label: z.string(),
      accountPool: z.number(),
      whyItRises: z.string(),
      mainRisk: z.string(),
      status: z.string(),
    }),
  ).min(1),
  whatWouldChangeThisAnswer: z.array(z.string()).min(1),
});
export type Stage7Output = z.infer<typeof Stage7Output>;
