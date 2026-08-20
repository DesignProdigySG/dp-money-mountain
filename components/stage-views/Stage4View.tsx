import type { Stage4Output } from "@/lib/schema/stage4-needs";
import type { DimensionValue } from "@/lib/schema/common";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { Card } from "@/components/Card";

const INTENSITY_COLOR: Record<string, string> = {
  high: "var(--evidence-sourced)",
  medium: "var(--evidence-modeled)",
  low: "var(--foreground-muted)",
};

export function Stage4View({
  output,
  profileValues,
}: {
  output: Stage4Output;
  profileValues: DimensionValue[];
}) {
  const labelFor = (id: string) => profileValues.find((v) => v.id === id)?.label ?? id;
  const needName = (id: string) => output.needsFramework.find((n) => n.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
          Needs framework
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {output.needsFramework.map((need) => (
            <div key={need.id} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: "var(--gridline)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{need.name}</div>
                {need.source && (
                  <EvidenceBadge status={need.source.status} sourceUrl={need.source.sourceUrl} sourceNote={need.source.sourceNote} />
                )}
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
                <span style={{ color: "var(--foreground-muted)" }}>Typical users: </span>
                {need.typicalUsers}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
                <span style={{ color: "var(--foreground-muted)" }}>Fit: </span>
                {need.productFit}
              </p>
              {need.hardExclusions && (
                <p className="mt-1 text-sm" style={{ color: "var(--status-serious)" }}>
                  Hard exclusion: {need.hardExclusions}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
          Profile → dominant need
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--foreground-muted)" }}>
                <th className="py-1.5 pr-3 font-medium">Profile value</th>
                <th className="py-1.5 pr-3 font-medium">Intensity</th>
                <th className="py-1.5 pr-3 font-medium">Dominant need</th>
                <th className="py-1.5 pr-3 font-medium">Workload</th>
              </tr>
            </thead>
            <tbody>
              {output.profileMappings.map((m) => (
                <tr key={m.profileValueId} className="border-t align-top" style={{ borderColor: "var(--gridline)" }}>
                  <td className="py-1.5 pr-3 font-medium">{labelFor(m.profileValueId)}</td>
                  <td className="py-1.5 pr-3">
                    <span className="font-medium" style={{ color: INTENSITY_COLOR[m.intensity] }}>
                      {m.intensity}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">{needName(m.dominantNeedCategoryId)}</td>
                  <td className="py-1.5 pr-3" style={{ color: "var(--foreground-secondary)" }}>
                    {m.workloadProfile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
