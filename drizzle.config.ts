import { defineConfig } from "drizzle-kit";

// Used only for `drizzle-kit introspect`/`studio`-style tooling during
// development. Actual schema changes go through Supabase directly (see
// lib/db/client.ts) — this is not wired into any app startup path.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
