import { describe, it, expect } from "vitest";
import { createProject, getProject, listProjects, updateProjectPayload, deleteProject, renameProject } from "./repo";

describe("db repo", () => {
  it("creates and reads back a project with an empty payload", async () => {
    const project = await createProject({ category: "Widgets", geography: "Malaysia", brand: "Acme" });
    const fetched = await getProject(project.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.payload.intake.category).toBe("Widgets");
    expect(fetched!.payload.stage1).toBeUndefined();
  });

  it("lists projects newest-updated first", async () => {
    const a = await createProject({ category: "A", geography: "SG", brand: "A" });
    // Timestamps are millisecond-resolution; force a's and b's to differ
    // so ordering isn't a coin flip on ties.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const b = await createProject({ category: "B", geography: "SG", brand: "B" });
    const all = await listProjects();
    const ids = all.map((p) => p.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
  });

  it("renames a project", async () => {
    const project = await createProject({ category: "Widgets", geography: "Malaysia", brand: "Acme" });
    await renameProject(project.id, "Renamed project");
    expect((await getProject(project.id))!.name).toBe("Renamed project");
  });

  it("rejects an update that produces an invalid payload, without writing it", async () => {
    const project = await createProject({ category: "Widgets", geography: "Malaysia", brand: "Acme" });
    await expect(
      updateProjectPayload(project.id, (payload) => ({
        ...payload,
        // @ts-expect-error intentionally invalid for this test
        intake: { ...payload.intake, category: undefined },
      })),
    ).rejects.toThrow();
    expect((await getProject(project.id))!.payload.intake.category).toBe("Widgets");
  });

  it("deletes a project", async () => {
    const project = await createProject({ category: "Widgets", geography: "Malaysia", brand: "Acme" });
    await deleteProject(project.id);
    expect(await getProject(project.id)).toBeNull();
  });
});
