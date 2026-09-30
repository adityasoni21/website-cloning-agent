import fs from "fs/promises";
import path from "path";

import {
  localRepair,
} from "./local-repair";

import type {
  RepairContext,
  RepairResult,
} from "./repair";

const MAX_REPAIR_ATTEMPTS = 3;

export async function repairProject(
  projectDirectory: string,
  buildError: string
): Promise<{
  success: boolean;
  attempts: number;
  explanations: string[];
}> {
  const explanations: string[] = [];

  for (
    let attempt = 1;
    attempt <= MAX_REPAIR_ATTEMPTS;
    attempt++
  ) {
    console.log(
      `[Repair] Attempt ${attempt}/${MAX_REPAIR_ATTEMPTS}`
    );

    const context: RepairContext = {
      projectDirectory,
      buildError,
    };

    const result: RepairResult =
      await localRepair(context);

    explanations.push(result.explanation);

    if (!result.repaired) {
      console.log(
        `[Repair] No local repair available: ${result.explanation}`
      );

      return {
        success: false,
        attempts: attempt,
        explanations,
      };
    }

    await applyChanges(
      projectDirectory,
      result
    );

    console.log(
      `[Repair] Applied ${result.changes.length} file change(s).`
    );

    /*
     * The caller performs the next build.
     *
     * We return after one repair because the new
     * build error may be completely different.
     */
    return {
      success: true,
      attempts: attempt,
      explanations,
    };
  }

  return {
    success: false,
    attempts: MAX_REPAIR_ATTEMPTS,
    explanations,
  };
}

async function applyChanges(
  projectDirectory: string,
  result: RepairResult
) {
  for (const change of result.changes) {
    const target = path.resolve(
      projectDirectory,
      change.path
    );

    const root = path.resolve(projectDirectory);

    if (
      target !== root &&
      !target.startsWith(root + path.sep)
    ) {
      throw new Error(
        `Unsafe repair path: ${change.path}`
      );
    }

    await fs.mkdir(
      path.dirname(target),
      { recursive: true }
    );

    if (change.delete) {
        try {
            await fs.unlink(target);
        } catch (error) {
            const code =
            error &&
            typeof error === "object" &&
            "code" in error
                ? error.code
                : undefined;

            if (code !== "ENOENT") {
            throw error;
            }
        }

        continue;
        }

        if (change.content === undefined) {
        throw new Error(
            `Repair change for ${change.path} has no content.`
        );
        }

        await fs.writeFile(
        target,
        change.content,
        "utf8"
        );
  }
}