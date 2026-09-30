import { NextResponse } from "next/server";

import { GeminiCodeGenerator } from "../../../lib/gemini-code-generator";
import { LocalCodeGenerator } from "../../../lib/local-code-generator";
import { writeGeneratedProject } from "../../../lib/project-writer";
import { validateGeneratedProject } from "../../../lib/build-validator";
import { repairProject } from "../../../lib/repair-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.pageSpec) {
      return NextResponse.json(
        {
          error: "PageSpec is required.",
        },
        { status: 400 }
      );
    }

    const pageSpec = body.pageSpec;

    let project;
    let generatorUsed: "gemini" | "local";

    /*
     * Primary generator:
     * Gemini
     */
    try {
      console.log("[Generator] Trying Gemini...");

      const generator = new GeminiCodeGenerator();

      project = await generator.generateProject(pageSpec);

      generatorUsed = "gemini";

      console.log("[Generator] Gemini generation succeeded.");
    } catch (geminiError) {
      console.error(
        "[Generator] Gemini failed. Falling back to local generator.",
        geminiError
      );

      /*
       * Fallback generator:
       * Deterministic local generator
       */
      const localGenerator = new LocalCodeGenerator();

      project = await localGenerator.generateProject(
        pageSpec
      );

      generatorUsed = "local";

      console.log(
        "[Generator] Local generation succeeded."
      );
    }

    const projectDirectory =
      await writeGeneratedProject(project);
    
      console.log(
      `[Validator] Validating ${projectDirectory}`
    );
    
    let validation =
      await validateGeneratedProject(
        projectDirectory
      );

    let repairAttempts = 0;
    const repairExplanations: string[] = [];

    while (
      !validation.success &&
      repairAttempts < 3
    ) {
      console.log(
        `[Generator] Build failed. Starting repair attempt ${
          repairAttempts + 1
        }...`
      );

      const repair = await repairProject(
        projectDirectory,
        validation.output
      );

      repairAttempts += repair.attempts;

      repairExplanations.push(
        ...repair.explanations
      );

      if (!repair.success) {
        console.log(
          "[Generator] No repair could be applied."
        );

        break;
      }

      validation =
        await validateGeneratedProject(
          projectDirectory
        );
    }

    return NextResponse.json({
      success: true,
      generator: generatorUsed,
      projectName: project.projectName,
      fileCount: project.files.length,
      projectDirectory,
      validation: {
        success: validation.success,
        exitCode: validation.exitCode,
        durationMs: validation.durationMs,
        repairAttempts,
        repairExplanations,
      },
      files: project.files.map((file) => file.path),
      ...(validation.success
        ? {}
        : {
          buildError: validation.output.slice(-12000)
        })
    });
  } catch (error) {
    console.error("[Generator] Failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown generation error.",
      },
      { status: 500 }
    );
  }
}