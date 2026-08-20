import { describe, it, expect } from "vitest";
import { iterativeProportionalFit } from "./ipf";

describe("iterativeProportionalFit", () => {
  it("converges to match row and column totals on a simple 2x2 case", () => {
    const result = iterativeProportionalFit({
      rowIds: ["r1", "r2"],
      rowTotals: [100, 200],
      colIds: ["c1", "c2"],
      colTotals: [120, 180],
    });
    expect(result.converged).toBe(true);
    const rowSums = result.matrix.map((row) => row.reduce((a, b) => a + b, 0));
    const colSums = [0, 1].map((j) => result.matrix.reduce((sum, row) => sum + row[j], 0));
    expect(rowSums[0]).toBeCloseTo(100, 0);
    expect(rowSums[1]).toBeCloseTo(200, 0);
    expect(colSums[0]).toBeCloseTo(120, 0);
    expect(colSums[1]).toBeCloseTo(180, 0);
  });

  it("matches the VAIO fixture's 5x8 totals (consistent row/col sums)", () => {
    const rowIds = ["lt25", "b25_49", "b50_199", "b200_1999", "b2000plus"];
    const rowTotals = [200784, 6996, 5391, 1389, 87];
    const colIds = ["prof_services", "finance_insurance", "infocomm", "real_estate", "wholesale_trade", "education", "admin_support", "retail_trade"];
    const colTotals = [45000, 11012, 24872, 9863, 57715, 6200, 22831, 37154];

    const result = iterativeProportionalFit({ rowIds, rowTotals, colIds, colTotals });
    expect(result.converged).toBe(true);
    expect(result.matrix.every((row) => row.every((v) => v >= 0))).toBe(true);
  });

  it("handles a zero row total without producing NaN", () => {
    const result = iterativeProportionalFit({
      rowIds: ["r1", "r2"],
      rowTotals: [0, 100],
      colIds: ["c1", "c2"],
      colTotals: [40, 60],
    });
    expect(result.matrix.flat().every((v) => Number.isFinite(v))).toBe(true);
    expect(result.matrix[0].reduce((a, b) => a + b, 0)).toBeCloseTo(0, 0);
  });
});
