import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { LlmClient, ResearchResult, ResearchSource } from "./client";

const DEFAULT_MODEL = "claude-opus-5";

export class AnthropicLlmClient implements LlmClient {
  readonly kind = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic();
    this.model = process.env.MONEY_MOUNTAIN_MODEL ?? DEFAULT_MODEL;
  }

  async research(args: { system: string; user: string }): Promise<ResearchResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: args.system,
      messages: [{ role: "user", content: args.user }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
    });

    let text = "";
    const sources: ResearchSource[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "web_search_tool_result") {
        const content = block.content;
        if (Array.isArray(content)) {
          for (const result of content) {
            sources.push({ url: result.url, title: result.title });
          }
        }
      }
    }
    return { text, sources };
  }

  async structure<T>(args: { system: string; user: string; schema: z.ZodType<T> }): Promise<T> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: args.system,
      messages: [{ role: "user", content: args.user }],
      output_config: { format: zodOutputFormat(args.schema) },
    });
    if (response.parsed_output === null) {
      throw new Error("AnthropicLlmClient: structured output failed to parse.");
    }
    return response.parsed_output;
  }
}
