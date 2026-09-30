import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { PageSpec } from "./page-spec";
import type {
  CodeGenerator,
  GeneratedProject,
} from "./generator";

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

const MAX_RETRIES_PER_MODEL = 1;

function isRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : JSON.stringify(error);

  return (
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("UNAVAILABLE") ||
    message.includes("high demand") ||
    message.includes("quota")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

export class GeminiCodeGenerator implements CodeGenerator {
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  async generateProject(
    pageSpec: PageSpec
  ): Promise<GeneratedProject> {
    const prompt = this.buildPrompt(pageSpec);

    let lastError: unknown = null;

    for (const model of MODELS) {
      for (
        let attempt = 1;
        attempt <= MAX_RETRIES_PER_MODEL;
        attempt++
      ) {
        try {
          console.log(
            `[GeminiCodeGenerator] Trying ${model}, attempt ${attempt}/${MAX_RETRIES_PER_MODEL}`
          );

          const response = await this.client.models.generateContent({
            model,

            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],

            config: {
              responseMimeType: "application/json",

              responseSchema: {
                type: "object",
                properties: {
                  projectName: {
                    type: "string",
                  },

                  files: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        path: {
                          type: "string",
                        },

                        content: {
                          type: "string",
                        },
                      },

                      required: ["path", "content"],
                    },
                  },
                },

                required: ["projectName", "files"],
              },

              thinkingConfig: {
                thinkingLevel: ThinkingLevel.MEDIUM,
              },
            },
          });

          const text = response.text;

          if (!text) {
            throw new Error(
              `Gemini returned an empty response from ${model}.`
            );
          }

          const parsed = JSON.parse(text);

          if (
            !parsed.projectName ||
            !Array.isArray(parsed.files)
          ) {
            throw new Error(
              `Invalid project structure returned by ${model}.`
            );
          }

          return {
            projectName: parsed.projectName,
            files: parsed.files,
          };
        } catch (error) {
          lastError = error;

          console.error(
            `[GeminiCodeGenerator] ${model} failed:`,
            getErrorMessage(error)
          );

          if (!isRetryableError(error)) {
            throw error;
          }

          if (attempt < MAX_RETRIES_PER_MODEL) {
            const delay = Math.min(
              1000 * 2 ** (attempt - 1),
              8000
            );

            console.log(
              `[GeminiCodeGenerator] Retrying in ${delay}ms...`
            );

            await sleep(delay);
          }
        }
      }

      console.log(
        `[GeminiCodeGenerator] Moving to next model after ${model}.`
      );
    }

    throw new Error(
      `All Gemini code-generation models failed. Last error: ${getErrorMessage(
        lastError
      )}`
    );
  }

  private buildPrompt(pageSpec: PageSpec): string {
    return `
You are an expert frontend engineer.

Generate a complete standalone Next.js website from the following PageSpec.

IMPORTANT REQUIREMENTS:

1. Use Next.js with TypeScript.
2. Use React components.
3. Use Tailwind CSS where appropriate.
4. Build a responsive desktop and mobile layout.
5. Recreate the described visual hierarchy accurately.
6. Use reusable components.
7. Do NOT use an iframe.
8. Do NOT embed the original website.
9. Do NOT use external website HTML.
10. The generated project must run locally.
11. Keep dependencies minimal.
12. Do not invent unnecessary features.
13. Use semantic HTML.
14. Make navigation responsive.
15. Make buttons and links functional where possible.

Generate these files:

- package.json
- tsconfig.json
- next.config.ts
- app/layout.tsx
- app/page.tsx
- app/globals.css
- components/*.tsx

Return ONLY valid JSON matching the requested schema.

PAGE SPEC:

${JSON.stringify(pageSpec)}
`;
  }
}