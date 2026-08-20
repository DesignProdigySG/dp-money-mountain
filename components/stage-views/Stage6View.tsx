import type { Stage6Output, ShortlistSegment } from "@/lib/schema/stage6-shortlist";
import type { DimensionValue } from "@/lib/schema/common";
import { Card } from "@/components/Card";

const TIER_META: Record<ShortlistSegment["tier"], { title: string; color: string }> = {
  top: { title: "Top hypotheses — validate first", color: "var(--evidence-sourced)" },
  watchlist: { title: "Extended watchlist", color: "var(--evidence-modeled)" },
  trap: { title: "Looks big, but not first attack", color: "var(--status-critical)" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function Stage6View({
  output,
  scaleValues,
  profileValues,
}: {
  output: Stage6Output;
  scaleValues: DimensionValue[];
  profileValues: DimensionValue[];
}) {
  const scaleLabel = (id: string) => scaleValues.find((v) => v.id === id)?.label ?? id;
  const profileLabel = (id: string) => profileValues.find((v) => v.id === id)?.label ?? id;

  const tiers: ShortlistSegment["tier"][] = ["top", "watchlist", "trap"];

  return (
    <div className="flex flex-col gap-4">
      {tiers.map((tier) => {
        const segments = output.segments.filter((s) => s.tier === tier).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        if (segments.length === 0) return null;
        const meta = TIER_META[tier];
        return (
          <Card key={tier}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                {meta.title}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {segments.map((s, i) => (
                <div key={`${s.scaleValueId}-${s.profileValueId}-${i}`} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: "var(--gridline)" }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="font-medium">
                      {profileLabel(s.profileValueId)} × {scaleLabel(s.scaleValueId)}
                    </div>
                    <div className="text-xs tabular-nums" style={{ color: "var(--foreground-muted)" }}>
                      {fmt(s.modeledAccounts)} modeled accounts · {s.fleetScaleProxy} · intensity {s.intensity}
                    </div>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
                    {s.whyAttractive}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--status-serious)" }}>
                    Risk: {s.mainRisk}
                  </p>
                  <p className="mt-1 text-xs italic" style={{ color: "var(--foreground-muted)" }}>
                    Next field question: {s.nextFieldQuestion}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {output.winnabilityCrossCheck && (
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
            Winnability cross-check
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
            {output.winnabilityCrossCheck}
          </p>
        </Card>
      )}
    </div>
  );
}
