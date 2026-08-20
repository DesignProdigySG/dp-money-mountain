import Link from "next/link";
import { STAGE_ORDER } from "@/lib/pipeline/stage-registry";
import { canGenerateStage } from "@/lib/pipeline/stage-registry";
import { STAGE_TITLES, type ProjectPayload, type StageId } from "@/lib/schema/payload";

export function StageNav({
  projectId,
  payload,
  current,
}: {
  projectId: string;
  payload: ProjectPayload;
  current: StageId | "battlefield";
}) {
  const pipelineStages = STAGE_ORDER.filter((s) => s !== "stage7");

  return (
    <nav className="flex flex-wrap gap-1.5 text-xs">
      {pipelineStages.map((stageId, i) => {
        const done = !!payload[stageId];
        const available = canGenerateStage(payload, stageId);
        const isCurrent = current === stageId;
        const disabled = !done && !available;
        const content = (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5"
            style={{
              borderColor: isCurrent ? "var(--series-pick)" : "var(--border)",
              backgroundColor: isCurrent ? "color-mix(in srgb, var(--series-pick) 12%, transparent)" : "var(--surface)",
              color: disabled ? "var(--foreground-muted)" : "var(--foreground)",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: done ? "var(--evidence-sourced)" : "var(--surface-2)",
                color: done ? "white" : "var(--foreground-muted)",
              }}
            >
              {done ? "✓" : i + 1}
            </span>
            {STAGE_TITLES[stageId]}
          </span>
        );
        return disabled ? (
          <span key={stageId}>{content}</span>
        ) : (
          <Link key={stageId} href={`/projects/${projectId}/stage/${stageId}`}>
            {content}
          </Link>
        );
      })}
      {(() => {
        const done = !!payload.stage7;
        const isCurrent = current === "battlefield";
        const content = (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium"
            style={{
              borderColor: isCurrent ? "var(--series-pick)" : "var(--border)",
              backgroundColor: isCurrent ? "color-mix(in srgb, var(--series-pick) 12%, transparent)" : "var(--surface)",
              color: done ? "var(--foreground)" : "var(--foreground-muted)",
              opacity: done ? 1 : 0.5,
            }}
          >
            🏔 Battlefield
          </span>
        );
        return done ? (
          <Link href={`/projects/${projectId}/battlefield`}>{content}</Link>
        ) : (
          <span>{content}</span>
        );
      })()}
    </nav>
  );
}
