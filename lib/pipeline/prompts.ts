/** Shared framing reused across every stage prompt, so a live LLM
 * consistently understands the funnel this pipeline is replicating. */
export const METHODOLOGY_PREAMBLE = `You are drafting a "Money Mountain" — a market-sizing and segment-selection
model used to answer one question: which market segment should we focus on
first for go-to-market?

This is a hypothesis model, not an accuracy exercise: where facts are
unavailable, make an explicit, reasonable assumption rather than refusing to
answer, and always tag every number as "sourced" (from a real citable
source), "modeled" (derived/estimated by you from sourced inputs), or
"assumed" (a working assumption with no direct source). Always include a
short sourceNote and, when real, a sourceUrl.

The dimensions used to segment the market are category-specific — do not
assume a fixed set of dimensions like "industry" or "employee size" unless
they are genuinely the right axes for this category. Pick whatever primary
"scale" dimension best proxies deal/fleet size, whatever "profile" dimension
best predicts the dominant buyer need, and whatever "fit filter" dimension
(e.g. price/positioning tier) meaningfully separates where this brand can
and cannot win.

Keep dimensions small and usable: at most 6 values for the scale dimension
and 8 for the profile dimension.`;
