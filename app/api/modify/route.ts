import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { GeminiModificationAgent } from "../../../lib/gemini-modification-agent";
import { localModifyProject } from "../../../lib/local-modification-agent";
import { applyModification } from "../../../lib/modification-writer";
import { validateGeneratedProject } from "../../../lib/build-validator";

interface BackupFile {
  path: string;
  existed: boolean;
  content?: string;
}

async function backupFiles(
  projectDirectory: string,
  files: string[]
): Promise<BackupFile[]> {
  const backups: BackupFile[] = [];

  for (const relativePath of files) {
    const absolutePath = path.join(
      projectDirectory,
      relativePath
    );

    try {
      const content = await fs.readFile(
        absolutePath,
        "utf8"
      );

      backups.push({
        path: relativePath,
        existed: true,
        content,
      });
    } catch {
      backups.push({
        path: relativePath,
        existed: false,
      });
    }
  }

  return backups;
}

async function restoreFiles(
  projectDirectory: string,
  backups: BackupFile[]
): Promise<void> {
  for (const backup of backups) {
    const absolutePath = path.join(
      projectDirectory,
      backup.path
    );

    if (backup.existed) {
      await fs.mkdir(
        path.dirname(absolutePath),
        { recursive: true }
      );

      await fs.writeFile(
        absolutePath,
        backup.content ?? "",
        "utf8"
      );
    } else {
      try {
        await fs.unlink(absolutePath);
      } catch {
        // File did not exist originally.
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const projectDirectory = body.projectDirectory;
    const instruction = body.instruction;

    if (
      typeof projectDirectory !== "string" ||
      typeof instruction !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "projectDirectory and instruction are required.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * 1. Try Gemini
     * --------------------------------------------------
     */

    const agent = new GeminiModificationAgent();

    let geminiResult;

    try {
      geminiResult = await agent.modifyProject(
        projectDirectory,
        instruction
      );
    } catch (error) {
      console.warn(
        "Gemini modification failed:",
        error
      );

      geminiResult = {
        success: false,
        explanation: "Gemini modification failed.",
        changes: [],
      };
    }

    /*
     * --------------------------------------------------
     * 2. If Gemini returned changes, validate them
     * --------------------------------------------------
     */

    if (
      geminiResult.success &&
      geminiResult.changes.length > 0
    ) {
      const changedPaths =
        geminiResult.changes.map(
          (change) => change.path
        );

      const backups = await backupFiles(
        projectDirectory,
        changedPaths
      );

      try {
        /*
         * IMPORTANT:
         * Apply Gemini's changes here.
         * Do NOT use localResult here because
         * localResult has not been created yet.
         */
        await applyModification(
          projectDirectory,
          {
            success: true,
            explanation: geminiResult.explanation,
            changes: geminiResult.changes,
          }
        );

        const validation =
          await validateGeneratedProject(
            projectDirectory
          );

        if (validation.success) {
          return NextResponse.json({
            success: true,
            agent: "gemini",
            explanation:
              geminiResult.explanation,
            filesChanged: changedPaths,
            validation,
          });
        }

        /*
         * Gemini produced invalid code.
         * Restore the original project.
         */

        console.warn(
          "Gemini modification produced an invalid build. Restoring original files."
        );

        await restoreFiles(
          projectDirectory,
          backups
        );
      } catch (error) {
        await restoreFiles(
          projectDirectory,
          backups
        );

        console.warn(
          "Gemini modification failed after applying changes:",
          error
        );
      }
    }

    /*
     * --------------------------------------------------
     * 3. Local modification fallback
     * --------------------------------------------------
     */

    const localResult =
      await localModifyProject({
        projectDirectory,
        instruction,
      });

    if (!localResult.success) {
      return NextResponse.json({
        success: false,
        agent: "local",
        explanation:
          localResult.explanation,
        filesChanged: [],
      });
    }

    const localPaths =
      localResult.changes.map(
        (change) => change.path
      );

    const localBackups =
      await backupFiles(
        projectDirectory,
        localPaths
      );

    try {
      /*
       * Apply the local modification.
       */
      await applyModification(
        projectDirectory,
        {
          success: true,
          explanation:
            localResult.explanation,
          changes: localResult.changes,
        }
      );

      const validation =
        await validateGeneratedProject(
          projectDirectory
        );

      if (!validation.success) {
        await restoreFiles(
          projectDirectory,
          localBackups
        );

        return NextResponse.json({
          success: false,
          agent: "local",
          explanation:
            "The local modification was applied but failed build validation. Original files were restored.",
          filesChanged: [],
          validation,
        });
      }

      return NextResponse.json({
        success: true,
        agent: "local",
        explanation:
          localResult.explanation,
        filesChanged: localPaths,
        validation,
      });
    } catch (error) {
      await restoreFiles(
        projectDirectory,
        localBackups
      );

      return NextResponse.json({
        success: false,
        agent: "local",
        explanation:
          error instanceof Error
            ? error.message
            : "Local modification failed.",
        filesChanged: [],
      });
    }
  } catch (error) {
    console.error(
      "Modification API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Modification failed.",
      },
      { status: 500 }
    );
  }
}