/**
 * Iterative proportional fitting (Deming-Stephan / RAS algorithm): given
 * row totals and column totals, fills interior cells so row/column sums
 * approximately match. Pure and deterministic — the LLM supplies sourced
 * totals + optional skew weights, this fills the matrix, matching the
 * spreadsheet's "modeled, not observed" interior cells.
 */
export interface IpfInput {
  rowIds: string[];
  rowTotals: number[];
  colIds: string[];
  colTotals: number[];
  /** Relative seed weights, rowIds.length x colIds.length. Defaults to
   * uniform (all 1s) if omitted. */
  seed?: number[][];
  maxIterations?: number;
  /** Max acceptable absolute deviation between a row/col sum and its target. */
  tolerance?: number;
}

export interface IpfResult {
  matrix: number[][];
  iterations: number;
  converged: boolean;
}

export function iterativeProportionalFit(input: IpfInput): IpfResult {
  const { rowIds, rowTotals, colIds, colTotals, seed, maxIterations = 25, tolerance = 0.5 } = input;
  const R = rowIds.length;
  const C = colIds.length;

  if (rowTotals.length !== R) throw new Error("rowTotals length must match rowIds length");
  if (colTotals.length !== C) throw new Error("colTotals length must match colIds length");

  const m: number[][] = seed
    ? seed.map((row) => [...row])
    : Array.from({ length: R }, () => Array(C).fill(1));

  let iterations = 0;
  let converged = false;

  for (; iterations < maxIterations; iterations++) {
    for (let i = 0; i < R; i++) {
      const rowSum = m[i].reduce((a, b) => a + b, 0) || 1;
      const factor = rowTotals[i] / rowSum;
      for (let j = 0; j < C; j++) m[i][j] *= factor;
    }
    for (let j = 0; j < C; j++) {
      let colSum = 0;
      for (let i = 0; i < R; i++) colSum += m[i][j];
      colSum = colSum || 1;
      const factor = colTotals[j] / colSum;
      for (let i = 0; i < R; i++) m[i][j] *= factor;
    }

    let maxDev = 0;
    for (let i = 0; i < R; i++) {
      const rowSum = m[i].reduce((a, b) => a + b, 0);
      maxDev = Math.max(maxDev, Math.abs(rowSum - rowTotals[i]));
    }
    if (maxDev <= tolerance) {
      converged = true;
      iterations++;
      break;
    }
  }

  return { matrix: m, iterations, converged };
}
