import { NextRequest, NextResponse } from "next/server";
import { StageId } from "@/lib/schema/payload";
import { runStage, StageDependencyError } from "@/lib/pipeline/stage-registry";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/stages/[stageId]/generate">,
) {
  const { id, stageId: rawStageId } = await ctx.params;
  const stageIdParsed = StageId.safeParse(rawStageId);
  if (!stageIdParsed.success) {
    return NextResponse.json({ error: "Unknown stage id" }, { status: 400 });
  }
  try {
    const result = await runStage(id, stageIdParsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StageDependencyError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
