import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateProjectPayload } from "@/lib/db/repo";
import { ProjectIntake } from "@/lib/schema/payload";
import { Stage1Output } from "@/lib/schema/stage1-framing";
import { Stage2Output } from "@/lib/schema/stage2-tam";
import { Stage3Output } from "@/lib/schema/stage3-segmentation";
import { Stage4Output } from "@/lib/schema/stage4-needs";
import { Stage5Output } from "@/lib/schema/stage5-fitfilter";
import { Stage6Output } from "@/lib/schema/stage6-shortlist";
import { Stage7Output } from "@/lib/schema/stage7-rollup";

const FIELD_SCHEMAS = {
  intake: ProjectIntake,
  stage1: Stage1Output,
  stage2: Stage2Output,
  stage3: Stage3Output,
  stage4: Stage4Output,
  stage5: Stage5Output,
  stage6: Stage6Output,
  stage7: Stage7Output,
} as const;

const Body = z.object({
  field: z.enum(["intake", "stage1", "stage2", "stage3", "stage4", "stage5", "stage6", "stage7"]),
  value: z.unknown(),
});

/** Manual-edit endpoint: replaces one top-level payload field (a stage's
 * output, or the intake) after validating it against that field's own
 * schema. MVP does not support partial/deep merge of a single nested value —
 * the client sends the full field value it wants to save. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/projects/[id]/payload">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const schema = FIELD_SCHEMAS[parsed.data.field];
  const valueParsed = schema.safeParse(parsed.data.value);
  if (!valueParsed.success) {
    return NextResponse.json({ error: `Invalid ${parsed.data.field}: ${valueParsed.error.message}` }, { status: 400 });
  }

  try {
    const updated = await updateProjectPayload(id, (payload) => ({
      ...payload,
      [parsed.data.field]: valueParsed.data,
    }));
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 404 });
  }
}
