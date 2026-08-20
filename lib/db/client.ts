import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and set it to your Supabase Postgres connection string.",
  );
}

// Schema changes are applied directly against Supabase (via the Supabase
// MCP `apply_migration` tool, or the Supabase dashboard/CLI) rather than
// through drizzle-kit's own migrator — Supabase already tracks applied
// migrations itself, and running two separate migration trackers against
// the same database invites drift. Drizzle here is the query layer only.
const globalForDb = globalThis as unknown as {
  __moneyMountainDb?: ReturnType<typeof drizzle>;
  __moneyMountainClient?: ReturnType<typeof postgres>;
};

// `prepare: false` is required when connecting through Supabase's Supavisor
// pooler in transaction mode (pgbouncer-style) — harmless on a direct
// connection too. Small pool since this mostly runs as short-lived
// serverless invocations.
const client = globalForDb.__moneyMountainClient ?? postgres(DATABASE_URL, { max: 5, prepare: false });
globalForDb.__moneyMountainClient = client;

export const db = globalForDb.__moneyMountainDb ?? drizzle(client, { schema });
globalForDb.__moneyMountainDb = db;
