/**
 * Seeds the VAIO Enterprise Laptops × Singapore example project through the
 * normal create + generate path (not special-cased) — proves the schema
 * and pipeline generalize by running the same code every other project runs.
 *
 * Usage: npm run seed:vaio
 */
import { createProject, listProjects } from "../lib/db/repo";
import { runStage, STAGE_ORDER } from "../lib/pipeline/stage-registry";

async function main() {
  const existing = listProjects().find(
    (p) => p.category === "Enterprise laptops" && p.geography === "Singapore" && p.brand === "VAIO",
  );
  if (existing) {
    console.log(`VAIO example project already exists: ${existing.id}`);
    return;
  }

  const project = createProject(
    {
      category: "Enterprise laptops",
      geography: "Singapore",
      brand: "VAIO",
      productDescription:
        "VAIO enterprise laptop range (Pro BK/BM/PG mainstream business, PK-R/SX14-R ultraportable premium).",
    },
    "VAIO — Enterprise laptops — Singapore",
  );
  console.log(`Created project ${project.id}`);

  for (const stageId of STAGE_ORDER) {
    const { stubbed } = await runStage(project.id, stageId);
    console.log(`  ${stageId} generated${stubbed ? " (mock — no ANTHROPIC_API_KEY)" : ""}`);
  }

  console.log(`\nDone. Visit /projects/${project.id}/battlefield once the dev server is running.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
