import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createProject, listProjects } from "@/lib/db/repo";
import { ProjectIntake } from "@/lib/schema/payload";

export async function GET() {
  return NextResponse.json(listProjects());
}

const CreateBody = z.object({
  intake: ProjectIntake,
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const project = createProject(parsed.data.intake, parsed.data.name);
  return NextResponse.json(project, { status: 201 });
}
