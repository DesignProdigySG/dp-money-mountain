import { z } from "zod";
import { Stage1Output } from "./stage1-framing";
import { Stage2Output } from "./stage2-tam";
import { Stage3Output } from "./stage3-segmentation";
import { Stage4Output } from "./stage4-needs";
import { Stage5Output } from "./stage5-fitfilter";
import { Stage6Output } from "./stage6-shortlist";
import { Stage7Output } from "./stage7-rollup";

export const STAGE_IDS = [
  "stage1",
  "stage2",
  "stage3",
  "stage4",
  "stage5",
  "stage6",
  "stage7",
] as const;
export const StageId = z.enum(STAGE_IDS);
export type StageId = z.infer<typeof StageId>;

export const ProjectIntake = z.object({
  category: z.string().min(1),
  geography: z.string().min(1),
  brand: z.string().min(1),
  productDescription: z.string().optional(),
});
export type ProjectIntake = z.infer<typeof ProjectIntake>;

export const StageMetaEntry = z.object({
  generatedFromInputHash: z.string().optional(),
  generatedAt: z.string().optional(),
  model: z.string().optional(),
});
export type StageMetaEntry = z.infer<typeof StageMetaEntry>;

export const CURRENT_SCHEMA_VERSION = 1 as const;

export const ProjectPayload = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  intake: ProjectIntake,
  stage1: Stage1Output.optional(),
  stage2: Stage2Output.optional(),
  stage3: Stage3Output.optional(),
  stage4: Stage4Output.optional(),
  stage5: Stage5Output.optional(),
  stage6: Stage6Output.optional(),
  stage7: Stage7Output.optional(),
  // Plain string-keyed record (not z.record(StageId, ...)) — Zod v4 treats an
  // enum-keyed record as requiring every key present, but stageMeta only has
  // entries for stages that have actually been generated.
  stageMeta: z.record(z.string(), StageMetaEntry).default({}),
});
export type ProjectPayload = z.infer<typeof ProjectPayload>;

export function emptyPayload(intake: ProjectIntake): ProjectPayload {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    intake,
    stageMeta: {},
  };
}

export const STAGE_TITLES: Record<StageId, string> = {
  stage1: "Framing & Dimensions",
  stage2: "TAM",
  stage3: "Segment Matrix",
  stage4: "Needs & Fit",
  stage5: "Pricing / Positioning Filter",
  stage6: "Shortlist",
  stage7: "Battlefield",
};
