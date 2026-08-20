import { z } from "zod";
import type { LlmClient } from "../llm/client";
import type { ProjectPayload, StageId } from "../schema/payload";

export interface StageDefinition<TInput, TOutput> {
  id: StageId;
  title: string;
  dependsOn: StageId[];
  outputSchema: z.ZodType<TOutput>;
  /** Returns null when upstream dependencies aren't satisfied yet. */
  buildInput(payload: ProjectPayload): TInput | null;
  run(input: TInput, llm: LlmClient): Promise<TOutput>;
  merge(payload: ProjectPayload, output: TOutput): ProjectPayload;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStageDefinition = StageDefinition<any, any>;
