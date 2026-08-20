import { createHash } from "node:crypto";

/** Deterministic hash of a JSON-serializable value, used to detect whether
 * a stage's stored output is stale relative to its current inputs. */
export function hashInput(value: unknown): string {
  const json = JSON.stringify(value, sortedReplacer);
  return createHash("sha256").update(json).digest("hex");
}

function sortedReplacer(_key: string, value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (value as Record<string, unknown>)[k];
        return acc;
      }, {});
  }
  return value;
}
