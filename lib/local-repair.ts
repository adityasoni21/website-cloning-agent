import fs from "fs/promises";
import path from "path";

import type {
  RepairContext,
  RepairResult,
} from "./repair";

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function localRepair(
  context: RepairContext
): Promise<RepairResult> {
  const error = context.buildError;

  /*
   * Repair: unsupported next.config.ts
   */
  if (
    error.includes(
      "Configuring Next.js via 'next.config.ts' is not supported"
    )
  ) {
    return repairNextConfig(context);
  }

  /*
   * Repair 1:
   * React / TypeScript readonly-array errors.
   */
  if (
    error.includes("readonly") &&
    error.includes("cannot be assigned")
  ) {
    return repairReadonlyArrays(context);
  }

  /*
   * Repair 2:
   * Missing dependency errors.
   */
  if (
    error.includes("Module not found") ||
    error.includes("Can't resolve")
  ) {
    return {
      repaired: false,
      changes: [],
      explanation:
        "The local repair engine cannot safely infer the missing dependency.",
    };
  }

  /*
   * Repair 3:
   * Common missing key warning.
   *
   * This is intentionally not treated as a build failure.
   */
  if (error.includes("unique key")) {
    return {
      repaired: false,
      changes: [],
      explanation:
        "React key warning detected. No build-breaking repair is required.",
    };
  }

  return {
    repaired: false,
    changes: [],
    explanation:
      "No deterministic local repair rule matched this build error.",
  };
}

async function repairReadonlyArrays(
  context: RepairContext
): Promise<RepairResult> {
  const rendererPath = path.join(
    context.projectDirectory,
    "components",
    "SiteRenderer.tsx"
  );

  const footerPath = path.join(
    context.projectDirectory,
    "components",
    "Footer.tsx"
  );

  const changes = [];

  if (await fileExists(rendererPath)) {
    let content = await fs.readFile(
      rendererPath,
      "utf8"
    );

    content = content.replace(
      /items:\s*\{\s*label:\s*string;\s*href:\s*string;\s*\}\[\];/g,
      `items: readonly {
    label: string;
    href: string;
  }[];`
    );

    content = content.replace(
      /content:\s*string\[\];/g,
      "content: readonly string[];"
    );

    content = content.replace(
      /sections:\s*\{/g,
      "sections: readonly {"
    );

    changes.push({
      path: "components/SiteRenderer.tsx",
      content,
    });
  }

  if (await fileExists(footerPath)) {
    let content = await fs.readFile(
      footerPath,
      "utf8"
    );

    content = content.replace(
      /items:\s*\{\s*label:\s*string;\s*href:\s*string;\s*\}\[\];/g,
      `items: readonly {
    label: string;
    href: string;
  }[];`
    );

    changes.push({
      path: "components/Footer.tsx",
      content,
    });
  }

  if (changes.length === 0) {
    return {
      repaired: false,
      changes: [],
      explanation:
        "Readonly error detected, but no matching generated component was found.",
    };
  }

  return {
    repaired: true,
    changes,
    explanation:
      "Converted generated array types to readonly-compatible types.",
  };
}

async function repairNextConfig(
  context: RepairContext
): Promise<RepairResult> {
  const tsConfigPath = path.join(
    context.projectDirectory,
    "next.config.ts"
  );

  const jsConfigPath = path.join(
    context.projectDirectory,
    "next.config.mjs"
  );

  if (!(await fileExists(tsConfigPath))) {
    return {
      repaired: false,
      changes: [],
      explanation:
        "next.config.ts was not found.",
    };
  }

  let content = await fs.readFile(
    tsConfigPath,
    "utf8"
  );

  /*
   * Convert the TypeScript config into an
   * ESM JavaScript config.
   *
   * The generated config normally looks like:
   *
   * import type { NextConfig } from "next";
   *
   * const nextConfig: NextConfig = {
   *   ...
   * };
   *
   * export default nextConfig;
   */

  content = content
    .replace(
      /import\s+type\s+\{\s*NextConfig\s*\}\s+from\s+["']next["'];?\s*/g,
      ""
    )
    .replace(
      /:\s*NextConfig\s*=/g,
      " ="
    );

  return {
    repaired: true,
    changes: [
      {
        path: "next.config.mjs",
        content,
      },
      {
        path: "next.config.ts",
        delete: true,
      }
    ],
    explanation:
      "Converted unsupported next.config.ts into next.config.mjs.",
  };
}