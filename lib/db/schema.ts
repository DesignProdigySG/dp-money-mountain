import { pgSchema, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

// Schema name is env-driven so the same table defs serve the real
// `money_mountain` schema and the isolated `money_mountain_test` schema
// used by the test suite, both living in the shared Supabase project.
const schemaName = process.env.MONEY_MOUNTAIN_DB_SCHEMA ?? "money_mountain";
const mm = pgSchema(schemaName);

export const projects = mm.table("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  geography: text("geography").notNull(),
  brand: text("brand").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull().default("local-user"),
  schemaVersion: integer("schema_version").notNull().default(1),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referenceDatasets = mm.table("reference_datasets", {
  canonicalKey: text("canonical_key").primaryKey(),
  geography: text("geography").notNull(),
  dimensionName: text("dimension_name").notNull(),
  description: text("description"),
  bandValues: jsonb("band_values").notNull(),
  accounts: jsonb("accounts").notNull(),
  asOfDate: text("as_of_date"),
  sourceNote: text("source_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stageRuns = mm.table("stage_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  stageId: text("stage_id").notNull(),
  inputHash: text("input_hash").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  model: text("model"),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
