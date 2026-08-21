import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { lookupAccounts, writeBackAccounts, REFERENCE_DATA_STALE_AFTER_DAYS } from "./reference-data";
import { getReferenceDataset } from "../db/repo";
import { db } from "../db/client";
import { referenceDatasets } from "../db/schema";

function bands() {
  return [
    { id: "lt25", label: "<25" },
    { id: "b25_49", label: "25–49" },
  ];
}

function baseArgs(canonicalKey: string) {
  return {
    canonicalKey,
    geography: "Testland",
    dimensionName: "Employee size band",
    bandValues: bands(),
    accounts: {
      lt25: { value: 100, status: "sourced" as const },
      b25_49: { value: 50, status: "sourced" as const },
    },
  };
}

describe("reference-data", () => {
  it("cache hit: returns the stored accounts when bands match", async () => {
    const key = `test-hit-${randomUUID()}`;
    await writeBackAccounts(baseArgs(key));
    const result = await lookupAccounts(key, bands());
    expect(result.hit).toBe(true);
    if (result.hit) {
      expect(result.accounts.lt25.value).toBe(100);
      expect(result.accounts.b25_49.value).toBe(50);
    }
  });

  it("cache miss: no-such-key when nothing is seeded", async () => {
    const result = await lookupAccounts(`test-missing-${randomUUID()}`, bands());
    expect(result).toEqual({ hit: false, reason: "no-such-key" });
  });

  it("cache miss: band-mismatch when candidate bands differ from the stored shape", async () => {
    const key = `test-mismatch-${randomUUID()}`;
    await writeBackAccounts(baseArgs(key));
    const result = await lookupAccounts(key, [{ id: "lt10", label: "<10" }]);
    expect(result).toEqual({ hit: false, reason: "band-mismatch" });
  });

  it("cache miss: stale when bands match but updatedAt is past the threshold", async () => {
    const key = `test-stale-${randomUUID()}`;
    await writeBackAccounts(baseArgs(key));
    const past = new Date(Date.now() - (REFERENCE_DATA_STALE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000);
    await db.update(referenceDatasets).set({ updatedAt: past }).where(eq(referenceDatasets.canonicalKey, key));
    const result = await lookupAccounts(key, bands());
    expect(result).toEqual({ hit: false, reason: "stale" });
  });

  it("write-back round trip: immediately visible via lookup", async () => {
    const key = `test-roundtrip-${randomUUID()}`;
    await writeBackAccounts(baseArgs(key));
    const dataset = await getReferenceDataset(key);
    expect(dataset).not.toBeNull();
    expect(dataset!.accounts.lt25.value).toBe(100);
  });

  it("upsert overwrite: second write wins, no duplicate-key error", async () => {
    const key = `test-overwrite-${randomUUID()}`;
    await writeBackAccounts(baseArgs(key));
    await writeBackAccounts({
      ...baseArgs(key),
      accounts: { lt25: { value: 999, status: "sourced" }, b25_49: { value: 50, status: "sourced" } },
    });
    const result = await lookupAccounts(key, bands());
    expect(result.hit).toBe(true);
    if (result.hit) expect(result.accounts.lt25.value).toBe(999);
  });
});
