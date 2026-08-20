import type { AnyStageDefinition } from "./types";
import type { StageId, ProjectPayload } from "../schema/payload";
import { STAGE_IDS } from "../schema/payload";
import { hashInput } from "./hash";
import { getLlmClient } from "../llm/factory";
import { getProject, updateProjectPayload, recordStageRun } from "../db/repo";

import { stage1Framing } from "./stages/stage1-framing";
import { stage2Tam } from "./stages/stage2-tam";
import { stage3Segmentation } from "./stages/stage3-segmentation";
import { stage4Needs } from "./stages/stage4-needs";
import { stage5FitFilter } from "./stages/stage5-fitfilter";
import { stage6Shortlist } from "./stages/stage6-shortlist";
import { stage7Rollup } from "./stages/stage7-rollup";

export const STAGE_ORDER: StageId[] = [...STAGE_IDS];

export const STAGES: Record<StageId, AnyStageDefinition> = {
  stage1: stage1Framing,
  stage2: stage2Tam,
  stage3: stage3Segmentation,
  stage4: stage4Needs,
  stage5: stage5FitFilter,
  stage6: stage6Shortlist,
  stage7: stage7Rollup,
};

export function canGenerateStage(payload: ProjectPayload, stageId: StageId): boolean {
  return STAGES[stageId].buildInput(payload) !== null;
}

export function isStageStale(payload: ProjectPayload, stageId: StageId): boolean {
  const stage = STAGES[stageId];
  const input = stage.buildInput(payload);
  if (input === null) return false;
  const meta = payload.stageMeta?.[stageId];
  if (!meta?.generatedFromInputHash) return false;
  return hashInput(input) !== meta.generatedFromInputHash;
}

export class StageDependencyError extends Error {}

export async function runStage(projectId: string, stageId: StageId) {
  const stage = STAGES[stageId];
  const project = getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const input = stage.buildInput(project.payload);
  if (input === null) {
    throw new StageDependencyError(
      `Stage ${stageId} depends on ${stage.dependsOn.join(", ") || "(nothing)"} — not all are generated yet.`,
    );
  }
  const inputHash = hashInput(input);
  const { client, stubbed } = await getLlmClient();

  let output: unknown;
  try {
    output = await stage.run(input, client);
    stage.outputSchema.parse(output);
  } catch (err) {
    recordStageRun({
      projectId,
      stageId,
      inputHash,
      input,
      output: null,
      model: stubbed ? "mock" : client.kind,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  recordStageRun({
    projectId,
    stageId,
    inputHash,
    input,
    output,
    model: stubbed ? "mock" : client.kind,
    status: "success",
  });

  const updated = updateProjectPayload(projectId, (payload) => {
    const merged = stage.merge(payload, output);
    return {
      ...merged,
      stageMeta: {
        ...merged.stageMeta,
        [stageId]: {
          generatedFromInputHash: inputHash,
          generatedAt: new Date().toISOString(),
          model: stubbed ? "mock" : client.kind,
        },
      },
    };
  });

  return { payload: updated.payload, output, stubbed };
}
