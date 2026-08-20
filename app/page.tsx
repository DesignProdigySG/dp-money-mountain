import Link from "next/link";
import { connection } from "next/server";
import { listProjects } from "@/lib/db/repo";

export default async function HomePage() {
  // better-sqlite3 is synchronous, so without this Next.js would treat the
  // read as build-time-constant and prerender/cache it — connection() opts
  // the page into per-request rendering. No-op in `next dev` (always
  // on-demand there) but load-bearing for `next build && next start`.
  await connection();
  const projects = listProjects();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Money Mountain</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
            Which mountain should we focus on? Start a project for a category, geography, and brand.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "var(--series-pick)" }}
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div
          className="rounded-lg border px-6 py-10 text-center text-sm"
          style={{ borderColor: "var(--border)", color: "var(--foreground-secondary)" }}
        >
          No projects yet. Start one to draft your first Money Mountain.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                    {p.category} · {p.geography} · {p.brand}
                  </div>
                </div>
                <div className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
