import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const DB_PATH =
  process.env.MONEY_MOUNTAIN_DB_PATH ?? path.join(process.cwd(), "data", "money-mountain.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const globalForDb = globalThis as unknown as { __moneyMountainDb?: ReturnType<typeof drizzle> };

function init() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

// Reuse across Next.js dev-server hot reloads so we don't reopen the file
// (and re-run migrations) on every module reload.
export const db = globalForDb.__moneyMountainDb ?? init();
globalForDb.__moneyMountainDb = db;
