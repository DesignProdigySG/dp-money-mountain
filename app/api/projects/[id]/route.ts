import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteProject, getProject, renameProject } from "@/lib/db/repo";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

const PatchBody = z.object({ name: z.string().min(1) });

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  await renameProject(id, parsed.data.name);
  const project = await getProject(id);
  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  await deleteProject(id);
  return new NextResponse(null, { status: 204 });
}
