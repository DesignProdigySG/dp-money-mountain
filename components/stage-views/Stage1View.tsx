import type { Stage1Output } from "@/lib/schema/stage1-framing";
import type { DimensionDef } from "@/lib/schema/common";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { Card } from "@/components/Card";

function DimensionCard({ title, dim }: { title: string; dim: DimensionDef }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
            {title}
          </div>
          <div className="text-base font-semibold">{dim.name}</div>
          {dim.description && (
            <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
              {dim.description}
            </p>
          )}
        </div>
        {dim.source && <EvidenceBadge status={dim.source.status} sourceUrl={dim.source.sourceUrl} sourceNote={dim.source.sourceNote} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {dim.values.map((v) => (
          <span
            key={v.id}
            className="rounded-full px-2.5 py-1 text-xs"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            {v.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

export function Stage1View({ output }: { output: Stage1Output }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
          Commercial question
        </div>
        <p className="mt-1 text-base font-medium">{output.framing.commercialQuestion}</p>
        <p className="mt-2 text-sm" style={{ color: "var(--foreground-secondary)" }}>
          {output.framing.narrative}
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <DimensionCard title="Scale dimension" dim={output.dimensionPlan.scaleDimension} />
        <DimensionCard title="Profile dimension" dim={output.dimensionPlan.profileDimension} />
        <DimensionCard title="Fit-filter dimension" dim={output.dimensionPlan.fitFilterDimension} />
      </div>
    </div>
  );
}
