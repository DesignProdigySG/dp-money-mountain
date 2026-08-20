import type { EvidenceStatus } from "@/lib/schema/common";

const LABEL: Record<EvidenceStatus, string> = {
  sourced: "Sourced",
  modeled: "Modeled",
  assumed: "Assumed",
};

const VAR: Record<EvidenceStatus, string> = {
  sourced: "var(--evidence-sourced)",
  modeled: "var(--evidence-modeled)",
  assumed: "var(--evidence-assumed)",
};

export function EvidenceBadge({
  status,
  sourceUrl,
  sourceNote,
}: {
  status: EvidenceStatus;
  sourceUrl?: string;
  sourceNote?: string;
}) {
  const badge = (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        color: VAR[status],
        backgroundColor: "color-mix(in srgb, " + VAR[status] + " 14%, transparent)",
      }}
      title={sourceNote}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: VAR[status] }} />
      {LABEL[status]}
    </span>
  );
  if (!sourceUrl) return badge;
  return (
    <a href={sourceUrl} target="_blank" rel="noreferrer" className="no-underline">
      {badge}
    </a>
  );
}
