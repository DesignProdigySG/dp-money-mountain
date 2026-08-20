import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/repo";
import { isStageStale } from "@/lib/pipeline/stage-registry";
import { StageNav } from "@/components/StageNav";
import { GenerateButton } from "@/components/GenerateButton";
import { StubbedBanner } from "@/components/StubbedBanner";
import { Card } from "@/components/Card";
import { MountainChart, type MountainChartRow } from "@/components/MountainChart";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default async function BattlefieldPage({ params }: PageProps<"/projects/[id]/battlefield">) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const { payload } = project;
  const output = payload.stage7;
  const missingDeps = (["stage1", "stage2", "stage6"] as const).filter((dep) => !payload[dep]);
  const stale = output ? isStageStale(payload, "stage7") : false;
  const meta = payload.stageMeta?.stage7;

  const rows: MountainChartRow[] = output
    ? output.chartData.map((row) => ({
        label: row.label,
        total: row.currentPick + row.other,
        isPick: row.currentPick > 0,
      }))
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link href={`/projects/${id}`} className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
        ← {project.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Which mountain should we focus on?</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
        {project.category} · {project.geography} · {project.brand}
      </p>

      <div className="mt-4">
        <StageNav projectId={id} payload={payload} current="battlefield" />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {meta?.model === "mock" && <StubbedBanner />}
        {stale && (
          <div className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: "var(--status-warning)" }}>
            An upstream stage changed since this was generated — consider regenerating.
          </div>
        )}

        {!output && missingDeps.length > 0 && (
          <Card>
            <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
              Complete the earlier stages first — waiting on stage(s) not yet generated.
            </p>
          </Card>
        )}

        {!output && missingDeps.length === 0 && (
          <Card>
            <p className="mb-3 text-sm" style={{ color: "var(--foreground-secondary)" }}>
              Ready to generate the battlefield rollup.
            </p>
            <GenerateButton projectId={id} stageId="stage7" label="Generate Battlefield" />
          </Card>
        )}

        {output && (
          <>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
                The mountain
              </div>
              <div className="mt-3">
                <MountainChart rows={rows} />
              </div>
            </Card>

            <Card>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
                The pick
              </div>
              <div className="mt-1 text-lg font-semibold">{output.topPick.label}</div>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: "var(--foreground-secondary)" }}>
                {output.topPick.rationale.map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
                Ranked result
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{ color: "var(--foreground-muted)" }}>
                      <th className="py-1.5 pr-3 font-medium">#</th>
                      <th className="py-1.5 pr-3 font-medium">Target hypothesis</th>
                      <th className="py-1.5 pr-3 font-medium">Account pool</th>
                      <th className="py-1.5 pr-3 font-medium">Why it rises</th>
                      <th className="py-1.5 pr-3 font-medium">Main risk</th>
                      <th className="py-1.5 pr-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {output.rankedTable.map((row) => (
                      <tr key={row.rank} className="border-t align-top" style={{ borderColor: "var(--gridline)" }}>
                        <td className="py-1.5 pr-3 font-medium">{row.rank}</td>
                        <td className="py-1.5 pr-3 font-medium">{row.label}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{fmt(row.accountPool)}</td>
                        <td className="py-1.5 pr-3" style={{ color: "var(--foreground-secondary)" }}>{row.whyItRises}</td>
                        <td className="py-1.5 pr-3" style={{ color: "var(--status-serious)" }}>{row.mainRisk}</td>
                        <td className="py-1.5 pr-3">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>
                What would change this answer
              </div>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm" style={{ color: "var(--foreground-secondary)" }}>
                {output.whatWouldChangeThisAnswer.map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
            </Card>

            <GenerateButton projectId={id} stageId="stage7" label="Regenerate" />
          </>
        )}
      </div>
    </div>
  );
}
