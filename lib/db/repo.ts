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
  const parsed = ProjectPayload.safeParse(row.payload);
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
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    payload: parsed.data,
  };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    geography: r.geography,
    brand: r.brand,
    status: r.status,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  }));
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (rows.length === 0) return null;
  return rowToRecord(rows[0]);
}

export async function createProject(intake: ProjectIntake, name?: string): Promise<ProjectRecord> {
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
    payload,
    createdAt: new Date(ts),
    updatedAt: new Date(ts),
  };
  await db.insert(projects).values(row);
  return rowToRecord(row as typeof projects.$inferSelect);
}

export async function renameProject(id: string, name: string): Promise<void> {
  await db.update(projects).set({ name, updatedAt: new Date() }).where(eq(projects.id, id));
}

export async function deleteProject(id: string): Promise<void> {
  await db.delete(stageRuns).where(eq(stageRuns.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

/** Reads the current payload, applies `updater`, validates the result, and
 * writes it back. Throws (without writing) if the result doesn't validate. */
export async function updateProjectPayload(
  id: string,
  updater: (payload: ProjectPayload) => ProjectPayload,
): Promise<ProjectRecord> {
  const existing = await getProject(id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const next = updater(existing.payload);
  const validated = ProjectPayload.parse(next);
  await db.update(projects).set({ payload: validated, updatedAt: new Date() }).where(eq(projects.id, id));
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

export async function recordStageRun(args: {
  projectId: string;
  stageId: StageId;
  inputHash: string;
  input: unknown;
  output: unknown;
  model: string | null;
  status: "success" | "error";
  error?: string | null;
}): Promise<StageRunRecord> {
  const id = randomUUID();
  const createdAt = nowIso();
  await db.insert(stageRuns).values({
    id,
    projectId: args.projectId,
    stageId: args.stageId,
    inputHash: args.inputHash,
    input: args.input,
    output: args.output === undefined ? null : args.output,
    model: args.model,
    status: args.status,
    error: args.error ?? null,
    createdAt: new Date(createdAt),
  });
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

export async function listStageRuns(projectId: string, stageId?: StageId): Promise<StageRunRecord[]> {
  const rows = await db.select().from(stageRuns).where(eq(stageRuns.projectId, projectId));
  const filtered = stageId ? rows.filter((r) => r.stageId === stageId) : rows;
  return filtered
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((r) => ({
      id: r.id,
      projectId: r.projectId,
      stageId: r.stageId as StageId,
      inputHash: r.inputHash,
      input: r.input,
      output: r.output ?? null,
      model: r.model,
      status: r.status as "success" | "error",
      error: r.error,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
}

export async function latestStageRun(projectId: string, stageId: StageId): Promise<StageRunRecord | null> {
  const runs = await listStageRuns(projectId, stageId);
  return runs[0] ?? null;
}
