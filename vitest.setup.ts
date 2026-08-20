// Tests run against the isolated `money_mountain_test` schema in the same
// Supabase Postgres database — never the real `money_mountain` schema.
// Requires DATABASE_URL to be set (see .env.example).
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Tests need a Postgres connection string (see .env.example) — " +
      "they run against the isolated `money_mountain_test` schema, not your real data.",
  );
}
process.env.MONEY_MOUNTAIN_DB_SCHEMA = "money_mountain_test";
