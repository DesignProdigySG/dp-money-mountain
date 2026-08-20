import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  geography: text("geography").notNull(),
  brand: text("brand").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull().default("local-user"),
  schemaVersion: integer("schema_version").notNull().default(1),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const stageRuns = sqliteTable("stage_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  stageId: text("stage_id").notNull(),
  inputHash: text("input_hash").notNull(),
  input: text("input").notNull(),
  output: text("output"),
  model: text("model"),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});
