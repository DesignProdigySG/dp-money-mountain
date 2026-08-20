import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/db/repo";
import { STAGES, isStageStale } from "@/lib/pipeline/stage-registry";
import { STAGE_IDS, STAGE_TITLES, type StageId } from "@/lib/schema/payload";
import { StageNav } from "@/components/StageNav";
import { GenerateButton } from "@/components/GenerateButton";
import { StubbedBanner } from "@/components/StubbedBanner";
import { Card } from "@/components/Card";
import { Stage1View } from "@/components/stage-views/Stage1View";
import { Stage2View } from "@/components/stage-views/Stage2View";
import { Stage3View } from "@/components/stage-views/Stage3View";
import { Stage4View } from "@/components/stage-views/Stage4View";
import { Stage5View } from "@/components/stage-views/Stage5View";
import { Stage6View } from "@/components/stage-views/Stage6View";

export default async function StagePage({ params }: PageProps<"/projects/[id]/stage/[stageId]">) {
  const { id, stageId: rawStageId } = await params;
  if (!(STAGE_IDS as readonly string[]).includes(rawStageId)) notFound();
  const stageId = rawStageId as StageId;
  if (stageId === "stage7") redirect(`/projects/${id}/battlefield`);

  const project = await getProject(id);
  if (!project) notFound();

  const { payload } = project;
  const stageDef = STAGES[stageId];
  const output = payload[stageId];
  const stale = isStageStale(payload, stageId);
  const meta = payload.stageMeta?.[stageId];
  const missingDeps = stageDef.dependsOn.filter((dep) => !payload[dep]);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link href={`/projects/${id}`} className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
        ← {project.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{STAGE_TITLES[stageId]}</h1>

      <div className="mt-4">
        <StageNav projectId={id} payload={payload} current={stageId} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {meta?.model === "mock" && <StubbedBanner />}

        {stale && (
          <div
            className="rounded-md border px-3 py-2 text-xs"
            style={{ borderColor: "var(--status-warning)", color: "var(--foreground)" }}
          >
            An upstream stage changed since this was generated — consider regenerating.
          </div>
        )}

        {!output && missingDeps.length > 0 && (
          <Card>
            <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
              Waiting on: {missingDeps.map((d) => STAGE_TITLES[d]).join(", ")}.
            </p>
          </Card>
        )}

        {!output && missingDeps.length === 0 && (
          <Card>
            <p className="mb-3 text-sm" style={{ color: "var(--foreground-secondary)" }}>
              Not generated yet.
            </p>
            <GenerateButton projectId={id} stageId={stageId} label={`Generate ${STAGE_TITLES[stageId]}`} />
          </Card>
        )}

        {output && (
          <>
            <StageOutput stageId={stageId} payload={payload} />
            <GenerateButton projectId={id} stageId={stageId} label="Regenerate" />
          </>
        )}
      </div>
    </div>
  );
}

function StageOutput({ stageId, payload }: { stageId: StageId; payload: import("@/lib/schema/payload").ProjectPayload }) {
  switch (stageId) {
    case "stage1":
      return <Stage1View output={payload.stage1!} />;
    case "stage2":
      return <Stage2View output={payload.stage2!} scaleValues={payload.stage1!.dimensionPlan.scaleDimension.values} />;
    case "stage3":
      return (
        <Stage3View
          output={payload.stage3!}
          scaleValues={payload.stage1!.dimensionPlan.scaleDimension.values}
          profileValues={payload.stage1!.dimensionPlan.profileDimension.values}
        />
      );
    case "stage4":
      return <Stage4View output={payload.stage4!} profileValues={payload.stage1!.dimensionPlan.profileDimension.values} />;
    case "stage5":
      return <Stage5View output={payload.stage5!} />;
    case "stage6":
      return (
        <Stage6View
          output={payload.stage6!}
          scaleValues={payload.stage1!.dimensionPlan.scaleDimension.values}
          profileValues={payload.stage1!.dimensionPlan.profileDimension.values}
        />
      );
    default:
      return null;
  }
}
