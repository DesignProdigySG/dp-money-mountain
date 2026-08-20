import type { Stage5Output } from "@/lib/schema/stage5-fitfilter";
import { Card } from "@/components/Card";

const ROLE_STYLE: Record<string, { color: string; label: string }> = {
  primary: { color: "var(--evidence-sourced)", label: "PRIMARY" },
  secondary: { color: "var(--evidence-modeled)", label: "SECONDARY" },
  deprioritize: { color: "var(--status-critical)", label: "DEPRIORITIZE" },
};

export function Stage5View({ output }: { output: Stage5Output }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {output.clusters.map((cluster) => {
        const role = ROLE_STYLE[cluster.strategicRole];
        return (
          <Card key={cluster.id}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{cluster.label}</div>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: role.color, backgroundColor: `color-mix(in srgb, ${role.color} 14%, transparent)` }}
              >
                {role.label}
              </span>
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--foreground-secondary)" }}>
              {cluster.rationale}
            </p>
            {cluster.competitorNote && (
              <p className="mt-2 text-xs" style={{ color: "var(--foreground-muted)" }}>
                Competitors: {cluster.competitorNote}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
