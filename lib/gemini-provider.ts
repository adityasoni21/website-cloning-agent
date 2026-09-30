import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import {
  PageSpecSchema,
  type PageSpec,
} from "./page-spec";

import type {
  AIProvider,
  WebsiteAnalysisInput,
} from "./ai-provider";

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

const MAX_RETRIES_PER_MODEL = 1;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const possibleError = error as {
    status?: number;
    code?: number;
  };

  if (typeof possibleError.status === "number") {
    return possibleError.status;
  }

  if (typeof possibleError.code === "number") {
    return possibleError.code;
  }

  return null;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);

  if (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("resource_exhausted") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("503") ||
    message.includes("429")
  );
}

function compactAnalysis(
  websiteAnalysis: WebsiteAnalysisInput
) {
  return {
    url: websiteAnalysis.url,

    finalUrl: websiteAnalysis.finalUrl,

    title: websiteAnalysis.title,

    description:
      websiteAnalysis.meta?.description || "",

    theme: websiteAnalysis.theme,

    headings:
      websiteAnalysis.headings
        ?.slice(0, 30)
        .map((heading) => ({
          level: heading.level,
          text: heading.text.slice(0, 200),
        })) || [],

    paragraphs:
      websiteAnalysis.paragraphs
        ?.slice(0, 20)
        .map((paragraph) =>
          paragraph.slice(0, 300)
        ) || [],

    navigation:
      websiteAnalysis.navigation
        ?.slice(0, 20) || [],

    images:
      websiteAnalysis.images
        ?.slice(0, 30)
        .map((image) => ({
          alt: image.alt,
          src: image.src,
          width: image.width,
          height: image.height,
        })) || [],

    buttons:
      websiteAnalysis.buttons
        ?.slice(0, 30) || [],

    sections:
      websiteAnalysis.sections
        ?.slice(0, 30)
        .map((section) => ({
          tag: section.tag,
          text: section.text.slice(0, 500),
          boundingBox: section.boundingBox,
        })) || [],

    elements:
      websiteAnalysis.elements
        ?.slice(0, 75) || [],
  };
}

const pageSpecJsonSchema = {
  type: "object",

  properties: {
    site: {
      type: "object",

      properties: {
        title: {
          type: "string",
        },

        description: {
          type: "string",
        },

        purpose: {
          type: "string",
        },
      },

      required: [
        "title",
        "description",
        "purpose",
      ],
    },

    theme: {
      type: "object",

      properties: {
        primaryColor: {
          type: "string",
        },

        secondaryColor: {
          type: "string",
        },

        backgroundColor: {
          type: "string",
        },

        textColor: {
          type: "string",
        },

        typography: {
          type: "object",

          properties: {
            headingFont: {
              type: "string",
            },

            bodyFont: {
              type: "string",
            },
          },

          required: [
            "headingFont",
            "bodyFont",
          ],
        },
      },

      required: [
        "primaryColor",
        "secondaryColor",
        "backgroundColor",
        "textColor",
        "typography",
      ],
    },

    navigation: {
      type: "object",

      properties: {
        exists: {
          type: "boolean",
        },

        items: {
          type: "array",

          items: {
            type: "object",

            properties: {
              label: {
                type: "string",
              },

              href: {
                type: "string",
              },
            },

            required: [
              "label",
              "href",
            ],
          },
        },

        behavior: {
          type: "string",
        },
      },

      required: [
        "exists",
        "items",
        "behavior",
      ],
    },

    sections: {
      type: "array",

      items: {
        type: "object",

        properties: {
          id: {
            type: "string",
          },

          type: {
            type: "string",
          },

          order: {
            type: "number",
          },

          purpose: {
            type: "string",
          },

          heading: {
            type: "string",
          },

          content: {
            type: "array",

            items: {
              type: "string",
            },
          },

          layout: {
            type: "object",

            properties: {
              direction: {
                type: "string",
              },

              alignment: {
                type: "string",
              },

              justification: {
                type: "string",
              },
            },

            required: [
              "direction",
              "alignment",
              "justification",
            ],
          },

          visualDescription: {
            type: "string",
          },

          backgroundColor: {
            type: "string",
          },

          hasImage: {
            type: "boolean",
          },

          imageDescription: {
            type: "string",
          },

          hasCTA: {
            type: "boolean",
          },

          ctaText: {
            type: "string",
          },
        },

        required: [
          "id",
          "type",
          "order",
          "purpose",
          "heading",
          "content",
          "layout",
          "visualDescription",
          "backgroundColor",
          "hasImage",
          "imageDescription",
          "hasCTA",
          "ctaText",
        ],
      },
    },

    footer: {
      type: "object",

      properties: {
        exists: {
          type: "boolean",
        },

        description: {
          type: "string",
        },
      },

      required: [
        "exists",
        "description",
      ],
    },

    responsive: {
      type: "object",

      properties: {
        mobileBehavior: {
          type: "string",
        },

        navigationBehavior: {
          type: "string",
        },

        layoutChanges: {
          type: "array",

          items: {
            type: "string",
          },
        },
      },

      required: [
        "mobileBehavior",
        "navigationBehavior",
        "layoutChanges",
      ],
    },

    designSummary: {
      type: "string",
    },
  },

  required: [
    "site",
    "theme",
    "navigation",
    "sections",
    "footer",
    "responsive",
    "designSummary",
  ],
};

async function callGemini(
  model: string,
  prompt: string
): Promise<PageSpec> {
  const response =
    await ai.models.generateContent({
      model,

      contents: prompt,

      config: {
        responseMimeType:
          "application/json",

        responseSchema:
          pageSpecJsonSchema,

        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

  if (!response.text) {
    throw new Error(
      `${model} returned an empty response.`
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error(
      `${model} returned invalid JSON.`
    );
  }

  const result =
    PageSpecSchema.safeParse(parsed);

  if (!result.success) {
    console.error(
      "PageSpec validation failed:",
      result.error.flatten()
    );

    throw new Error(
      `${model} returned invalid PageSpec data.`
    );
  }

  return result.data;
}

export class GeminiProvider
  implements AIProvider
{
  async generatePageSpec(
    websiteAnalysis: WebsiteAnalysisInput
  ): Promise<PageSpec> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured."
      );
    }

    const compact =
      compactAnalysis(
        websiteAnalysis
      );

    const prompt = `
You are a senior frontend reverse-engineering agent.

Analyze the supplied website observations and
create a structured PageSpec for recreating the
website as a new React/Next.js application.

Rules:

1. Do not invent unsupported sections.
2. Preserve the original information architecture.
3. Identify the visual hierarchy.
4. Identify section purposes.
5. Infer layout from bounding boxes and styles.
6. Pay attention to typography, spacing and colors.
7. Infer responsive behavior from the available
   desktop/mobile information.
8. Prefer reusable conceptual components.
9. Do not generate React code yet.
10. Return only the requested structured JSON.

Website observations:

${JSON.stringify(compact)}
`;

    let lastError: unknown = null;

    for (
      const model of MODELS
    ) {
      for (
        let attempt = 0;
        attempt < MAX_RETRIES_PER_MODEL;
        attempt++
      ) {
        try {
          console.log(
            `[AI] Trying ${model}, attempt ${
              attempt + 1
            }/${MAX_RETRIES_PER_MODEL}`
          );

          return await callGemini(
            model,
            prompt
          );
        } catch (error) {
          lastError = error;

          console.error(
            `[AI] ${model} failed:`,
            error
          );

          if (
            !isRetryableError(error)
          ) {
            throw error;
          }

          if (attempt < MAX_RETRIES_PER_MODEL) {
            const delay = Math.min(
              1000 * 2 ** (attempt - 1),
              8000
            );

            console.log(
              `[AI] Retrying in ${delay}ms...`
            );

            await new Promise((resolve) =>
              setTimeout(resolve, delay)
            );
          }
        }
      }

      console.warn(
        `[AI] ${model} unavailable. Trying fallback model.`
      );
    }

    throw new Error(
      `All Gemini models failed. Last error: ${
        lastError instanceof Error
          ? lastError.message
          : String(lastError)
      }`
    );
  }
}