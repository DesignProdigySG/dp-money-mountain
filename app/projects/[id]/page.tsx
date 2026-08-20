import { notFound, redirect } from "next/navigation";
import { getProject } from "@/lib/db/repo";
import { STAGE_ORDER } from "@/lib/pipeline/stage-registry";

export default async function ProjectRootPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  if (project.payload.stage7) {
    redirect(`/projects/${id}/battlefield`);
  }
  const firstIncomplete = STAGE_ORDER.find((stageId) => !project.payload[stageId]) ?? STAGE_ORDER[0];
  redirect(`/projects/${id}/stage/${firstIncomplete}`);
}
