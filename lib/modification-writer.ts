import fs from "fs/promises";
import path from "path";

import type {
  ModificationResult,
} from "./modification";

export async function applyModification(
  projectDirectory: string,
  result: ModificationResult
) {
  if (!result.success) {
    throw new Error(
      result.explanation ||
        "Modification was not successful."
    );
  }

  const root = path.resolve(
    projectDirectory
  );

  for (const change of result.changes) {
    const target = path.resolve(
      projectDirectory,
      change.path
    );

    /*
     * Security:
     * Never allow the model to write outside
     * the generated project.
     */
    if (
      target !== root &&
      !target.startsWith(root + path.sep)
    ) {
      throw new Error(
        `Unsafe modification path: ${change.path}`
      );
    }

    await fs.mkdir(
      path.dirname(target),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      target,
      change.content,
      "utf8"
    );
  }

  return {
    filesChanged: result.changes.map(
      (change) => change.path
    ),
  };
}