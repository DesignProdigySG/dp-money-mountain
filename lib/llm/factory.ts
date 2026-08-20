import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./client";
import { MockLlmClient } from "./mock-client";
import { AnthropicLlmClient } from "./anthropic-client";

let cached: { client: LlmClient; stubbed: boolean } | null = null;

/**
 * Attempts a real Anthropic client; falls back to the mock on any
 * authentication failure. Cached for the process lifetime — call
 * `resetLlmClientCache()` in tests that need a fresh probe.
 */
export async function getLlmClient(): Promise<{ client: LlmClient; stubbed: boolean }> {
  if (cached) return cached;

  const hasCredential =
    !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_AUTH_TOKEN;

  if (!hasCredential) {
    cached = { client: new MockLlmClient(), stubbed: true };
    return cached;
  }

  try {
    const anthropic = new Anthropic();
    // Cheap auth probe: list models rather than spending a full message call.
    await anthropic.models.list({ limit: 1 });
    cached = { client: new AnthropicLlmClient(anthropic), stubbed: false };
  } catch {
    cached = { client: new MockLlmClient(), stubbed: true };
  }
  return cached;
}

export function resetLlmClientCache() {
  cached = null;
}
