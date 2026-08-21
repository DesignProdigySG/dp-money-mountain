import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { stage2Tam } from "./stage2-tam";
import { writeBackAccounts } from "../reference-data";
import { getReferenceDataset } from "../../db/repo";
import { MockLlmClient } from "../../llm/mock-client";
import type { LlmClient, ResearchResult } from "../../llm/client";

/** Minimal test double with kind: "anthropic" — MockLlmClient can't be reused
 * here since it's hardcoded kind: "mock", and the reference-data cache logic
 * is deliberately gated on kind !== "mock"; a test built on MockLlmClient
 * would never exercise the cache-hit/write-back code path at all. */
class FakeLlmClient implements LlmClient {
  readonly kind = "anthropic" as const;
  constructor(private structureResponse: unknown) {}
  async research(): Promise<ResearchResult> {
    return { text: "fake research notes", sources: [] };
  }
  async structure<T>(args: { schema: z.ZodType<T> }): Promise<T> {
    return args.schema.parse(this.structureResponse);
  }
}

function llmOutput(overrides: { lt25Accounts?: number } = {}) {
  return {
    topDown: { benchmark: { value: 350000, status: "modeled" }, basisNote: "test" },
    bottomUpRows: [
      {
        scaleValueId: "lt25",
        accounts: { value: overrides.lt25Accounts ?? 1, status: "sourced" },
        avgUnitsPerAccount: { value: 4, status: "assumed" },
        penetration: { value: 0.4, status: "assumed" },
        cycleYears: { value: 4, status: "assumed" },
      },
    ],
  };
}

function baseInput(canonicalKey?: string) {
  return {
    category: "Widgets",
    geography: "Testland",
    commercialQuestion: "Is this worth pursuing?",
    scaleDimension: {
      name: "Employee size band",
      values: [{ id: "lt25", label: "<25" }],
      canonicalKey,
    },
  };
}

describe("stage2Tam.run — reference-data cache integration", () => {
  it("cache-hit override: uses the cached accounts value, not the model's wrong answer", async () => {
    const key = `test-stage2-hit-${randomUUID()}`;
    await writeBackAccounts({
      canonicalKey: key,
      geography: "Testland",
      dimensionName: "Employee size band",
      bandValues: [{ id: "lt25", label: "<25" }],
      accounts: { lt25: { value: 999999, status: "sourced" } },
    });

    const fake = new FakeLlmClient(llmOutput({ lt25Accounts: 1 })); // model deliberately "wrong"
    const output = await stage2Tam.run(baseInput(key), fake);

    expect(output.bottomUp.rows[0].accounts.value).toBe(999999);
    expect(output.bottomUp.rows[0].accounts.status).toBe("sourced");
  });

  it("cache-miss write-back: seeds the cache from the freshly-researched value", async () => {
    const key = `test-stage2-miss-${randomUUID()}`;
    expect(await getReferenceDataset(key)).toBeNull();

    const fake = new FakeLlmClient(llmOutput({ lt25Accounts: 42424 }));
    await stage2Tam.run(baseInput(key), fake);

    const dataset = await getReferenceDataset(key);
    expect(dataset).not.toBeNull();
    expect(dataset!.accounts.lt25.value).toBe(42424);
  });

  it("mock mode: cache is a no-op regardless of canonicalKey", async () => {
    const key = `test-stage2-mock-${randomUUID()}`;
    const mock = new MockLlmClient();
    const output = await stage2Tam.run(baseInput(key), mock);

    // Unchanged from today's fixture-driven mock behavior.
    expect(output.bottomUp.rows.find((r) => r.scaleValueId === "lt25")?.accounts.value).toBe(337700);
    // No write-back happened despite canonicalKey being declared.
    expect(await getReferenceDataset(key)).toBeNull();
  });
});
