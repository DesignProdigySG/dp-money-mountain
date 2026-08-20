import type { Stage3Output } from "@/lib/schema/stage3-segmentation";
import type { DimensionValue } from "@/lib/schema/common";
import { Card } from "@/components/Card";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function Stage3View({
  output,
  scaleValues,
  profileValues,
}: {
  output: Stage3Output;
  scaleValues: DimensionValue[];
  profileValues: DimensionValue[];
}) {
  const cellFor = (scaleId: string, profileId: string) =>
    output.cells.find((c) => c.scaleValueId === scaleId && c.profileValueId === profileId);
  const max = Math.max(1, ...output.cells.map((c) => c.count.value));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
            Modeled account matrix
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              color: output.ipfConverged ? "var(--evidence-sourced)" : "var(--evidence-assumed)",
              backgroundColor: `color-mix(in srgb, ${output.ipfConverged ? "var(--evidence-sourced)" : "var(--evidence-assumed)"} 14%, transparent)`,
            }}
          >
            {output.ipfConverged ? "IPF converged" : "IPF approximate"}
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-1.5 pr-3 text-left font-medium" style={{ color: "var(--foreground-muted)" }}>
                  {" "}
                </th>
                {profileValues.map((p) => (
                  <th key={p.id} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--foreground-muted)" }}>
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scaleValues.map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: "var(--gridline)" }}>
                  <td className="py-1.5 pr-3 font-medium">{s.label}</td>
                  {profileValues.map((p) => {
                    const cell = cellFor(s.id, p.id);
                    const v = cell?.count.value ?? 0;
                    const intensity = v / max;
                    return (
                      <td
                        key={p.id}
                        className="px-2 py-1.5 text-right tabular-nums"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--series-pick) ${Math.round(intensity * 45)}%, transparent)`,
                        }}
                        title={cell?.count.sourceNote}
                      >
                        {fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--foreground-muted)" }}>
          Interior cells are modeled via iterative proportional fitting from sourced row/column totals — directional, not exact counts.
        </p>
      </Card>

      {output.reconciliationNotes.length > 0 && (
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
            Reconciliation notes
          </div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm" style={{ color: "var(--foreground-secondary)" }}>
            {output.reconciliationNotes.map((note, i) => (
              <li key={i}>• {note}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
