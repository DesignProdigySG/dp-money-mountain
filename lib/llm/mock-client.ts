import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { LlmClient, ResearchResult } from "./client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

/**
 * Fixture-backed implementation, hand-authored from the VAIO spreadsheet.
 * This is real production code, not a test-only shim — the whole app must
 * be demoable on this alone, since no ANTHROPIC_API_KEY is guaranteed to
 * be present wherever this runs.
 */
export class MockLlmClient implements LlmClient {
  readonly kind = "mock" as const;

  async research(): Promise<ResearchResult> {
    return {
      text: "(mock mode — no live research performed; structure() returns fixture data)",
      sources: [],
    };
  }

  async structure<T>(args: { schema: z.ZodType<T>; schemaName: string }): Promise<T> {
    const path = join(FIXTURES_DIR, `${args.schemaName}.json`);
    let raw: string;
    try {
      raw = readFileSync(path, "utf-8");
    } catch {
      throw new Error(
        `MockLlmClient: no fixture at ${path}. Add lib/llm/fixtures/${args.schemaName}.json.`,
      );
    }
    const parsed = args.schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(
        `MockLlmClient: fixture ${args.schemaName}.json failed schema validation: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }
}
