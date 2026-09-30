import fs from "node:fs/promises";
import path from "node:path";

import type {
  GeneratedProject,
} from "./generator";

const GENERATED_ROOT = path.join(
  process.cwd(),
  "generated-sites"
);

function validateRelativePath(
  filePath: string
) {
  if (
    filePath.includes("..") ||
    path.isAbsolute(filePath)
  ) {
    throw new Error(
      `Unsafe generated file path: ${filePath}`
    );
  }
}

export async function writeGeneratedProject(
  project: GeneratedProject
): Promise<string> {
  const safeName =
    project.projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) ||
    "generated-site";

  const projectDirectory =
    path.join(
      GENERATED_ROOT,
      safeName
    );

  await fs.rm(
    projectDirectory,
    {
      recursive: true,
      force: true,
    }
  );

  await fs.mkdir(
    projectDirectory,
    {
      recursive: true,
    }
  );

  for (const file of project.files) {
    validateRelativePath(file.path);

    const targetPath =
      path.join(
        projectDirectory,
        file.path
      );

    await fs.mkdir(
      path.dirname(targetPath),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      targetPath,
      file.content,
      "utf8"
    );
  }

  return projectDirectory;
}