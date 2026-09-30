import type {
  AIProvider,
} from "../ai-provider";

import {
  GeminiProvider,
} from "../gemini-provider";

import {
  MockProvider,
} from "../mock-provider";

export function getAIProvider(): AIProvider {
  const provider =
    process.env.AI_PROVIDER ||
    "gemini";

  switch (provider) {
    case "mock":
      console.log(
        "[AI] Using MockProvider"
      );

      return new MockProvider();

    case "gemini":
    default:
      console.log(
        "[AI] Using GeminiProvider"
      );

      return new GeminiProvider();
  }
}