import {
  getReferenceDataset,
  listReferenceDatasets,
  upsertReferenceDataset,
} from "../db/repo";
import type { DimensionValue, SourcedValue } from "../schema/common";

/** How long a cached reference dataset is trusted before it's treated as a
 * miss and refreshed. No scheduler — this is checked at lookup time, so the
 * cache self-refreshes the next time a project actually touches it. */
export const REFERENCE_DATA_STALE_AFTER_DAYS = 180;

export interface CanonicalCatalogEntry {
  canonicalKey: string;
  geography: string;
  dimensionName: string;
  bandValues: DimensionValue[];
}

export async function listCanonicalCatalog(): Promise<CanonicalCatalogEntry[]> {
  const datasets = await listReferenceDatasets();
  return datasets.map((d) => ({
    canonicalKey: d.canonicalKey,
    geography: d.geography,
    dimensionName: d.dimensionName,
    bandValues: d.bandValues,
  }));
}

export type AccountsLookupResult =
  | { hit: true; accounts: Record<string, SourcedValue<number>> }
  | { hit: false; reason: "not-declared" | "no-such-key" | "band-mismatch" | "stale" };

function isStale(updatedAtIso: string): boolean {
  const ageMs = Date.now() - new Date(updatedAtIso).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > REFERENCE_DATA_STALE_AFTER_DAYS;
}

/** Looks up a cached accounts-per-band dataset by canonical key. Bands must
 * match by exact id-set equality (order-independent) — no fuzzy/numeric band
 * reconciliation. A matching-but-aged-out entry is reported "stale" (not
 * "band-mismatch"), so callers route it into the same refresh path as a
 * brand-new key. */
export async function lookupAccounts(
  canonicalKey: string,
  candidateValues: { id: string; label: string }[],
): Promise<AccountsLookupResult> {
  const dataset = await getReferenceDataset(canonicalKey);
  if (!dataset) return { hit: false, reason: "no-such-key" };

  const canonicalIds = new Set(dataset.bandValues.map((v) => v.id));
  const candidateIds = candidateValues.map((v) => v.id);
  const matches =
    candidateIds.length === canonicalIds.size && candidateIds.every((id) => canonicalIds.has(id));
  if (!matches) {
    console.warn(
      `reference-data: canonicalKey "${canonicalKey}" band mismatch — falling back to live research`,
    );
    return { hit: false, reason: "band-mismatch" };
  }

  if (isStale(dataset.updatedAt)) {
    return { hit: false, reason: "stale" };
  }

  return { hit: true, accounts: dataset.accounts };
}

/** Seeds or refreshes a canonical reference dataset. Idempotent (upsert) —
 * safe to call both from a seed script and from a stage's write-back path on
 * a "no-such-key" or "stale" miss. */
export async function writeBackAccounts(args: {
  canonicalKey: string;
  geography: string;
  dimensionName: string;
  description?: string;
  bandValues: { id: string; label: string }[];
  accounts: Record<string, SourcedValue<number>>;
  asOfDate?: string;
  sourceNote?: string;
}): Promise<void> {
  await upsertReferenceDataset({
    canonicalKey: args.canonicalKey,
    geography: args.geography,
    dimensionName: args.dimensionName,
    description: args.description,
    bandValues: args.bandValues.map((v) => ({ id: v.id, label: v.label })),
    accounts: args.accounts,
    asOfDate: args.asOfDate,
    sourceNote: args.sourceNote,
  });
}
