"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { z } from "zod";

const FormSchema = z.object({
  category: z.string().min(1, "Required"),
  geography: z.string().min(1, "Required"),
  brand: z.string().min(1, "Required"),
  productDescription: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

export default function NewProjectPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { category: "", geography: "", brand: "", productDescription: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intake: {
          category: values.category,
          geography: values.geography,
          brand: values.brand,
          productDescription: values.productDescription || undefined,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? "Failed to create project.");
      return;
    }
    const project = await res.json();
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <Link href="/" className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New Money Mountain</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--foreground-secondary)" }}>
        One category, one geography, one brand — this becomes its own saved project.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
        <Field label="Category" hint="e.g. Enterprise laptops" error={errors.category?.message}>
          <input {...register("category")} className="mm-input" placeholder="Enterprise laptops" />
        </Field>
        <Field label="Geography" hint="e.g. Singapore" error={errors.geography?.message}>
          <input {...register("geography")} className="mm-input" placeholder="Singapore" />
        </Field>
        <Field label="Brand / product" hint="e.g. VAIO" error={errors.brand?.message}>
          <input {...register("brand")} className="mm-input" placeholder="VAIO" />
        </Field>
        <Field label="Product description (optional)" hint="A sentence or two — used to draft the fit framework.">
          <textarea
            {...register("productDescription")}
            className="mm-input"
            rows={3}
            placeholder="VAIO enterprise laptop range: mainstream business laptops through ultraportable premium mobile devices."
          />
        </Field>

        {submitError && (
          <p className="text-sm" style={{ color: "var(--status-critical)" }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "var(--series-pick)" }}
        >
          {isSubmitting ? "Creating…" : "Create project"}
        </button>
      </form>

      <style>{`
        .mm-input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--foreground);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .mm-input:focus {
          outline: 2px solid var(--series-pick);
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs" style={{ color: "var(--foreground-muted)" }}>
          {hint}
        </span>
      )}
      {error && (
        <span className="text-xs" style={{ color: "var(--status-critical)" }}>
          {error}
        </span>
      )}
    </label>
  );
}
