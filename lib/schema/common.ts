import { z } from "zod";

/**
 * Every fact drafted by the AI pipeline is wrapped in this envelope so the
 * sourced/modeled/assumed distinction is structural, not a UI convention.
 */
export const EvidenceStatus = z.enum(["sourced", "modeled", "assumed"]);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

export const Confidence = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof Confidence>;

export function sourcedValue<T extends z.ZodTypeAny>(inner: T) {
  return z.object({
    value: inner,
    status: EvidenceStatus,
    confidence: Confidence.optional(),
    // Loose string, not `.url()` — LLM output occasionally returns a
    // near-URL (missing scheme, trailing punctuation); failing validation
    // on that is worse than storing it as-is.
    sourceUrl: z.string().optional(),
    sourceNote: z.string().optional(),
  });
}
export type SourcedValue<T> = {
  value: T;
  status: EvidenceStatus;
  confidence?: Confidence;
  sourceUrl?: string;
  sourceNote?: string;
};

export function sourced<T>(
  value: T,
  status: EvidenceStatus,
  extra?: Partial<Omit<SourcedValue<T>, "value" | "status">>,
): SourcedValue<T> {
  return { value, status, ...extra };
}

export const DimensionValue = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().optional(),
});
export type DimensionValue = z.infer<typeof DimensionValue>;

/**
 * A dimension is data, not a hardcoded column — the same shape describes
 * "employee size band" for laptops or a totally different axis for another
 * category. Stage 1 of the pipeline decides what dimensions apply.
 */
export const DimensionDef = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  values: z.array(DimensionValue).min(1),
  source: sourcedValue(z.string()).optional(),
  /** Self-declaration that this dimension's values are copied verbatim from
   * a known reference dataset (see lib/pipeline/reference-data.ts) — e.g. a
   * geography's standard employee-size bands, a census-like fact that's the
   * same regardless of category. Only Stage 2's scaleDimension acts on this
   * today; other dimensions may carry it inertly. */
  canonicalKey: z.string().optional(),
});
export type DimensionDef = z.infer<typeof DimensionDef>;
