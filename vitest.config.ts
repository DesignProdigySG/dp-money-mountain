import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Next.js auto-loads .env.local at runtime; Vitest doesn't, so we load it
// ourselves here (same file Next.js reads) rather than duplicating env vars.
// Skip empty values so an unset-but-present key (e.g. `ANTHROPIC_API_KEY=`)
// doesn't shadow "really unset" with an empty string.
for (const [key, value] of Object.entries(loadEnv("", process.cwd(), ""))) {
  if (value !== "") process.env[key] = value;
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
