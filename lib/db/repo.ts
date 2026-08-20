import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import { projects, stageRuns } from "./schema";
import {
  CURRENT_SCHEMA_VERSION,
  ProjectIntake,
  ProjectPayload,
  StageId,
  emptyPayload,
} from "../schema/payload";

export interface ProjectSummary {
  id: string;
  name: string;
  category: string;
  geography: string;
  brand: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord extends ProjectSummary {
  payload: ProjectPayload;
}

function nowIso() {
  return new Date().toISOString();
}

function rowToRecord(row: typeof projects.$inferSelect): ProjectRecord {
  const parsed = ProjectPayload.safeParse(JSON.parse(row.payload));
  if (!parsed.success) {
    throw new Error(`Project ${row.id} payload failed schema validation: ${parsed.error.message}`);
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    geography: row.geography,
    brand: row.brand,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    payload: parsed.data,
  };
}

export function listProjects(): ProjectSummary[] {
  return db.select().from(projects).orderBy(desc(projects.updatedAt)).all();
}

export function getProject(id: string): ProjectRecord | null {
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) return null;
  return rowToRecord(row);
}

export function createProject(intake: ProjectIntake, name?: string): ProjectRecord {
  const id = randomUUID();
  const ts = nowIso();
  const payload = emptyPayload(intake);
  const row = {
    id,
    name: name?.trim() || `${intake.brand} — ${intake.category} — ${intake.geography}`,
    category: intake.category,
    geography: intake.geography,
    brand: intake.brand,
    status: "draft",
    createdBy: "local-user",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    payload: JSON.stringify(payload),
    createdAt: ts,
    updatedAt: ts,
  };
  db.insert(projects).values(row).run();
  return rowToRecord(row as typeof projects.$inferSelect);
}

export function renameProject(id: string, name: string): void {
  db.update(projects).set({ name, updatedAt: nowIso() }).where(eq(projects.id, id)).run();
}

export function deleteProject(id: string): void {
  db.delete(stageRuns).where(eq(stageRuns.projectId, id)).run();
  db.delete(projects).where(eq(projects.id, id)).run();
}

/** Reads the current payload, applies `updater`, validates the result, and
 * writes it back. Throws (without writing) if the result doesn't validate. */
export function updateProjectPayload(
  id: string,
  updater: (payload: ProjectPayload) => ProjectPayload,
): ProjectRecord {
  const existing = getProject(id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const next = updater(existing.payload);
  const validated = ProjectPayload.parse(next);
  db
    .update(projects)
    .set({ payload: JSON.stringify(validated), updatedAt: nowIso() })
    .where(eq(projects.id, id))
    .run();
  return { ...existing, payload: validated, updatedAt: nowIso() };
}

export interface StageRunRecord {
  id: string;
  projectId: string;
  stageId: StageId;
  inputHash: string;
  input: unknown;
  output: unknown;
  model: string | null;
  status: "success" | "error";
  error: string | null;
  createdAt: string;
}

export function recordStageRun(args: {
  projectId: string;
  stageId: StageId;
  inputHash: string;
  input: unknown;
  output: unknown;
  model: string | null;
  status: "success" | "error";
  error?: string | null;
}): StageRunRecord {
  const id = randomUUID();
  const createdAt = nowIso();
  db
    .insert(stageRuns)
    .values({
      id,
      projectId: args.projectId,
      stageId: args.stageId,
      inputHash: args.inputHash,
      input: JSON.stringify(args.input),
      output: args.output === undefined ? null : JSON.stringify(args.output),
      model: args.model,
      status: args.status,
      error: args.error ?? null,
      createdAt,
    })
    .run();
  return {
    id,
    projectId: args.projectId,
    stageId: args.stageId,
    inputHash: args.inputHash,
    input: args.input,
    output: args.output ?? null,
    model: args.model,
    status: args.status,
    error: args.error ?? null,
    createdAt,
  };
}

export function listStageRuns(projectId: string, stageId?: StageId): StageRunRecord[] {
  const rows = stageId
    ? db
        .select()
        .from(stageRuns)
        .where(eq(stageRuns.projectId, projectId))
        .all()
        .filter((r) => r.stageId === stageId)
    : db.select().from(stageRuns).where(eq(stageRuns.projectId, projectId)).all();
  return rows
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((r) => ({
      id: r.id,
      projectId: r.projectId,
      stageId: r.stageId as StageId,
      inputHash: r.inputHash,
      input: JSON.parse(r.input),
      output: r.output ? JSON.parse(r.output) : null,
      model: r.model,
      status: r.status as "success" | "error",
      error: r.error,
      createdAt: r.createdAt,
    }));
}

export function latestStageRun(projectId: string, stageId: StageId): StageRunRecord | null {
  const runs = listStageRuns(projectId, stageId);
  return runs[0] ?? null;
}
