import { z } from "zod";

export interface ResearchSource {
  url: string;
  title?: string;
}

export interface ResearchResult {
  text: string;
  sources: ResearchSource[];
}

/**
 * Two-call pattern per grounded stage: `research()` (web search, freeform
 * text + citations) then `structure()` (forced structured output against a
 * Zod schema, given the research text as context). Kept as two calls rather
 * than one because mixing a mid-turn server tool with a forced structured
 * final turn isn't a documented-safe combination — see the plan's note on
 * validating this against a live key.
 */
export interface LlmClient {
  readonly kind: "anthropic" | "mock";
  research(args: { system: string; user: string }): Promise<ResearchResult>;
  structure<T>(args: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
    /** Used by MockLlmClient to pick the right fixture file. */
    schemaName: string;
  }): Promise<T>;
}
