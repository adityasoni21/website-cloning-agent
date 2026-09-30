import fs from "fs/promises";
import path from "path";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import type {
  ModificationAgent,
} from "./modification-agent";

import type {
  ModificationResult,
} from "./modification";

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

const MAX_RETRIES_PER_MODEL = 1;

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : JSON.stringify(error);
}

function isRetryableError(error: unknown) {
  const message = getErrorMessage(error);

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

export class GeminiModificationAgent
  implements ModificationAgent
{
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured."
      );
    }

    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  async modifyProject(
    projectDirectory: string,
    instruction: string
  ): Promise<ModificationResult> {
    const files = await this.readProjectFiles(
      projectDirectory
    );

    const prompt = this.buildPrompt(
      instruction,
      files
    );

    let lastError: unknown = null;

    for (const model of MODELS) {
      for (
        let attempt = 1;
        attempt <= MAX_RETRIES_PER_MODEL;
        attempt++
      ) {
        try {
          console.log(
            `[Modifier] Trying ${model}, attempt ${attempt}/${MAX_RETRIES_PER_MODEL}`
          );

          const response =
            await this.client.models.generateContent({
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
                responseMimeType:
                  "application/json",

                responseSchema: {
                  type: "object",

                  properties: {
                    success: {
                      type: "boolean",
                    },

                    explanation: {
                      type: "string",
                    },

                    changes: {
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

                        required: [
                          "path",
                          "content",
                        ],
                      },
                    },
                  },

                  required: [
                    "success",
                    "explanation",
                    "changes",
                  ],
                },

                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.LOW,
                },
              },
            });

          const text = response.text;

          if (!text) {
            throw new Error(
              "Gemini returned an empty modification response."
            );
          }

          const parsed = JSON.parse(text);

          if (
            typeof parsed.success !==
              "boolean" ||
            typeof parsed.explanation !==
              "string" ||
            !Array.isArray(parsed.changes)
          ) {
            throw new Error(
              "Invalid modification response."
            );
          }

          return {
            success: parsed.success,
            explanation:
              parsed.explanation,
            changes: parsed.changes,
          };
        } catch (error) {
          lastError = error;

          console.error(
            `[Modifier] ${model} failed:`,
            getErrorMessage(error)
          );

          if (!isRetryableError(error)) {
            throw error;
          }

          if (attempt < MAX_RETRIES_PER_MODEL) {
            await sleep(
              Math.min(
                1000 * 2 ** (attempt - 1),
                8000
              )
            );
          }
        }
      }
    }

    throw new Error(
      `All modification models failed. Last error: ${getErrorMessage(
        lastError
      )}`
    );
  }

  private async readProjectFiles(
    projectDirectory: string
  ): Promise<
    {
      path: string;
      content: string;
    }[]
  > {
    const allowedExtensions = new Set([
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".css",
      ".mjs",
      ".json",
    ]);

    const files: {
      path: string;
      content: string;
    }[] = [];

    async function walk(
      directory: string
    ): Promise<void> {
      const entries =
        await fs.readdir(directory, {
          withFileTypes: true,
        });

      for (const entry of entries) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".next" ||
          entry.name === ".git"
        ) {
          continue;
        }

        const fullPath = path.join(
          directory,
          entry.name
        );

        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        const extension = path.extname(
          entry.name
        );

        if (
          !allowedExtensions.has(extension)
        ) {
          continue;
        }

        const content =
          await fs.readFile(
            fullPath,
            "utf8"
          );

        files.push({
          path: path.relative(
            projectDirectory,
            fullPath
          ),
          content,
        });
      }
    }

    await walk(projectDirectory);

    return files;
  }

  private buildPrompt(
    instruction: string,
    files: {
      path: string;
      content: string;
    }[]
  ) {
    const projectFiles = files
      .map(
        (file) =>
          `
===== FILE: ${file.path} =====

${file.content}
`
      )
      .join("\n");

    return `
You are modifying an existing Next.js website.

The user gave this instruction:

"${instruction}"

Your task is to modify the existing website to satisfy
the user's instruction.

IMPORTANT RULES:

1. Modify only what is necessary.
2. Preserve the existing design unless the instruction
   requires changing it.
3. Do not rewrite unrelated files.
4. Return complete file contents for every changed file.
5. Do not return partial files.
6. Do not use an iframe.
7. Do not embed another website.
8. Keep the project compatible with Next.js and TypeScript.
9. Preserve responsive behavior.
10. Use existing reusable components whenever possible.
11. Do not add unnecessary dependencies.
12. If the requested modification cannot be performed
    safely, return success=false and no changes.
13. File paths must be relative to the project root.

Return ONLY JSON matching the requested schema.

CURRENT PROJECT:

${projectFiles}
`;
  }
}