import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolated temp sqlite DB per test-file module registry, set before any
// lib/db/client.ts import (which reads this env var at module load time).
if (!process.env.MONEY_MOUNTAIN_DB_PATH) {
  const dir = mkdtempSync(join(tmpdir(), "money-mountain-test-"));
  process.env.MONEY_MOUNTAIN_DB_PATH = join(dir, "test.db");
}
