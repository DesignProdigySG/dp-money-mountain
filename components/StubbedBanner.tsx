export function StubbedBanner() {
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs"
      style={{
        borderColor: "var(--evidence-modeled)",
        backgroundColor: "color-mix(in srgb, var(--evidence-modeled) 12%, transparent)",
        color: "var(--foreground)",
      }}
    >
      <strong>STUBBED</strong> — no live Anthropic API key in this environment, so this stage shows
      the same hand-authored VAIO / Enterprise laptops / Singapore example fixture every time, not
      content drafted for your actual category/geography/brand above. Set{" "}
      <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">ANTHROPIC_API_KEY</code> and
      regenerate to draft it for real.
    </div>
  );
}
