"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StageId } from "@/lib/schema/payload";

export function GenerateButton({
  projectId,
  stageId,
  label,
}: {
  projectId: string;
  stageId: StageId;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/stages/${stageId}/generate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Generation failed.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--series-pick)" }}
      >
        {pending ? "Generating…" : label}
      </button>
      {error && (
        <span className="text-xs" style={{ color: "var(--status-critical)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
