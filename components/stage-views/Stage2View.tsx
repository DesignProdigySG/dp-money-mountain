import type { Stage2Output } from "@/lib/schema/stage2-tam";
import type { DimensionValue } from "@/lib/schema/common";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { Card } from "@/components/Card";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function Stage2View({
  output,
  scaleValues,
}: {
  output: Stage2Output;
  scaleValues: DimensionValue[];
}) {
  const labelFor = (id: string) => scaleValues.find((v) => v.id === id)?.label ?? id;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
              Top-down benchmark
            </div>
            <div className="text-2xl font-semibold tabular-nums">{fmt(output.topDown.benchmark.value)}</div>
          </div>
          <EvidenceBadge
            status={output.topDown.benchmark.status}
            sourceUrl={output.topDown.benchmark.sourceUrl}
            sourceNote={output.topDown.benchmark.sourceNote}
          />
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--foreground-secondary)" }}>
          {output.topDown.basisNote}
        </p>
      </Card>

      <Card>
        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
          Bottom-up build
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--foreground-muted)" }}>
                <th className="py-1.5 pr-3 font-medium">Band</th>
                <th className="py-1.5 pr-3 font-medium">Accounts</th>
                <th className="py-1.5 pr-3 font-medium">Avg / account</th>
                <th className="py-1.5 pr-3 font-medium">Penetration</th>
                <th className="py-1.5 pr-3 font-medium">Cycle (yrs)</th>
                <th className="py-1.5 pr-3 font-medium">Annualized demand</th>
              </tr>
            </thead>
            <tbody>
              {output.bottomUp.rows.map((row) => (
                <tr key={row.scaleValueId} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                  <td className="py-1.5 pr-3 font-medium">{labelFor(row.scaleValueId)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">
                    {fmt(row.accounts.value)}{" "}
                    <EvidenceBadge status={row.accounts.status} sourceUrl={row.accounts.sourceUrl} sourceNote={row.accounts.sourceNote} />
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">
                    {fmt(row.avgUnitsPerAccount.value)}{" "}
                    <EvidenceBadge status={row.avgUnitsPerAccount.status} sourceNote={row.avgUnitsPerAccount.sourceNote} />
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">
                    {(row.penetration.value * 100).toFixed(0)}%{" "}
                    <EvidenceBadge status={row.penetration.status} sourceNote={row.penetration.sourceNote} />
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">
                    {row.cycleYears.value}{" "}
                    <EvidenceBadge status={row.cycleYears.status} sourceNote={row.cycleYears.sourceNote} />
                  </td>
                  <td className="py-1.5 pr-3 font-medium tabular-nums">{fmt(row.annualizedDemand)}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold" style={{ borderColor: "var(--gridline)" }}>
                <td className="py-1.5 pr-3">Total</td>
                <td colSpan={4} />
                <td className="py-1.5 pr-3 tabular-nums">{fmt(output.bottomUp.totalAnnualizedDemand)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
          Reconciliation
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
          {output.reconciliation.note}
        </p>
      </Card>
    </div>
  );
}
