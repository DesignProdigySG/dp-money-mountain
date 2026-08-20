import { NextRequest, NextResponse } from "next/server";
import { StageId } from "@/lib/schema/payload";
import { listStageRuns } from "@/lib/db/repo";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/stages/[stageId]/runs">,
) {
  const { id, stageId: rawStageId } = await ctx.params;
  const stageIdParsed = StageId.safeParse(rawStageId);
  if (!stageIdParsed.success) {
    return NextResponse.json({ error: "Unknown stage id" }, { status: 400 });
  }
  return NextResponse.json(listStageRuns(id, stageIdParsed.data));
}
