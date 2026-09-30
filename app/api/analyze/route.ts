import { NextRequest, NextResponse } from "next/server";

import { analyzeWebsite } from "@/lib/analyzer";
import { getAIProvider } from "@/lib/ai";
import { MockProvider } from "@/lib/mock-provider";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          error: "A website URL is required.",
        },
        {
          status: 400,
        }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid URL.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["http:", "https:"].includes(
        parsedUrl.protocol
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only HTTP and HTTPS URLs are supported.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ---------------------------------------------
     * 1. Analyze website with Playwright
     * ---------------------------------------------
     */

    const analysis = await analyzeWebsite(url);

    /*
     * ---------------------------------------------
     * 2. Generate PageSpec
     *
     * Try the configured AI provider first.
     * If Gemini is unavailable, fall back to
     * the deterministic MockProvider.
     * ---------------------------------------------
     */

    const aiProvider = getAIProvider();

    let pageSpec;
    let pageSpecProvider: "gemini" | "mock";

    try {
      console.log("[AI] Generating PageSpec...");

      pageSpec =
        await aiProvider.generatePageSpec(
          analysis
        );

      pageSpecProvider =
        aiProvider.constructor.name ===
        "GeminiProvider"
          ? "gemini"
          : "mock";

      console.log(
        `[AI] PageSpec generated using ${pageSpecProvider}.`
      );
    } catch (aiError) {
      console.warn(
        "[AI] Primary PageSpec provider failed. Falling back to MockProvider.",
        aiError
      );

      const mockProvider = new MockProvider();

      pageSpec =
        await mockProvider.generatePageSpec(
          analysis
        );

      pageSpecProvider = "mock";

      console.log(
        "[AI] PageSpec generated using MockProvider."
      );
    }

    /*
     * ---------------------------------------------
     * 3. Return complete analysis result
     * ---------------------------------------------
     */

    return NextResponse.json({
      analysis,
      pageSpec,
      pageSpecProvider,
    });
  } catch (error) {
    console.error(
      "Website analysis failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Website analysis failed.",
      },
      {
        status: 500,
      }
    );
  }
}