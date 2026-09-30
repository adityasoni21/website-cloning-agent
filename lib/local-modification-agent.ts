import fs from "fs/promises";
import path from "path";
import type { ModificationResult } from "./modification";

interface LocalModificationContext {
  projectDirectory: string;
  instruction: string;
}

interface FileChange {
  path: string;
  content: string;
}

function normalizeInstruction(instruction: string): string {
  return instruction.trim().toLowerCase();
}

async function readFile(
  projectDirectory: string,
  relativePath: string
): Promise<string> {
  return fs.readFile(
    path.join(projectDirectory, relativePath),
    "utf8"
  );
}

async function fileExists(
  projectDirectory: string,
  relativePath: string
): Promise<boolean> {
  try {
    await fs.access(path.join(projectDirectory, relativePath));
    return true;
  } catch {
    return false;
  }
}

function replaceAll(
  content: string,
  search: string,
  replacement: string
): string {
  return content.split(search).join(replacement);
}

function extractColor(instruction: string): string | null {
  const hex = instruction.match(
    /#[0-9a-f]{3,8}\b/i
  );

  if (hex) {
    return hex[0];
  }

  const colors: Record<string, string> = {
    red: "#ef4444",
    blue: "#2563eb",
    green: "#16a34a",
    purple: "#9333ea",
    orange: "#f97316",
    pink: "#ec4899",
    yellow: "#eab308",
    black: "#000000",
    white: "#ffffff",
  };

  for (const [name, value] of Object.entries(colors)) {
    if (instruction.includes(name)) {
      return value;
    }
  }

  return null;
}

async function modifyPrimaryColor(
  projectDirectory: string,
  instruction: string
): Promise<FileChange[]> {
  const color = extractColor(instruction);

  if (!color) {
    throw new Error(
      "Could not determine the requested primary color."
    );
  }

  const changes: FileChange[] = [];

  /*
   * --------------------------------------------------
   * 1. Update the generated site's configuration
   * --------------------------------------------------
   */

  const configPath =
    "lib/site-config.ts";

  if (
    await fileExists(
      projectDirectory,
      configPath
    )
  ) {
    const original = await readFile(
      projectDirectory,
      configPath
    );

    const updated =
      original.replace(
        /("primaryColor"\s*:\s*)"[^"]*"/,
        `$1"${color}"`
      );

    if (updated !== original) {
      changes.push({
        path: configPath,
        content: updated,
      });
    }
  }

  /*
   * --------------------------------------------------
   * 2. Update CSS variable
   * --------------------------------------------------
   */

  const cssPath =
    "app/globals.css";

  if (
    await fileExists(
      projectDirectory,
      cssPath
    )
  ) {
    const original = await readFile(
      projectDirectory,
      cssPath
    );

    const updated =
      original.replace(
        /(--primary-color:\s*)[^;]+;/,
        `$1${color};`
      );

    if (updated !== original) {
      changes.push({
        path: cssPath,
        content: updated,
      });
    }
  }

  if (changes.length === 0) {
    throw new Error(
      `Could not find a primaryColor configuration in the generated project.`
    );
  }

  return changes;
}

async function makeNavbarSticky(
  projectDirectory: string
): Promise<FileChange[]> {
  const relativePath = "components/Navbar.tsx";

  if (!(await fileExists(projectDirectory, relativePath))) {
    throw new Error("Navbar component not found.");
  }

  const original = await readFile(
    projectDirectory,
    relativePath
  );

  // Already sticky.
  if (
    original.includes("sticky top-0") ||
    original.includes("fixed top-0")
  ) {
    return [];
  }

  /*
   * Prefer the header because the generated local
   * scaffold uses <header className="site-header">.
   */
  const headerPattern =
    /<header\s+className="([^"]*)"/;

  const headerMatch =
    original.match(headerPattern);

  console.log("LOCAL STICKY DEBUG", {
    hasSticky: original.includes("sticky top-0"),
    hasFixed: original.includes("fixed top-0"),
    headerMatch: headerMatch?.[0],
    });

  if (headerMatch) {
    const existingClasses =
      headerMatch[1];

    const updatedClasses =
      `${existingClasses} sticky top-0 z-50`;

    const updated =
      original.replace(
        headerMatch[0],
        `<header className="${updatedClasses}"`
      );

    return [
      {
        path: relativePath,
        content: updated,
      },
    ];
  }

  /*
   * Generic fallback for generated projects where
   * the navbar itself owns the className.
   */
  const navPattern =
    /<nav\s+className="([^"]*)"/;

  const navMatch =
    original.match(navPattern);

  if (navMatch) {
    const existingClasses =
      navMatch[1];

    const updatedClasses =
      `${existingClasses} sticky top-0 z-50`;

    const updated =
      original.replace(
        navMatch[0],
        `<nav className="${updatedClasses}"`
      );

    return [
      {
        path: relativePath,
        content: updated,
      },
    ];
  }

  throw new Error(
    "Could not find a header or nav element to make sticky."
  );
}

async function addTestimonials(
  projectDirectory: string
): Promise<FileChange[]> {
  const pagePath = "app/page.tsx";

  if (!(await fileExists(projectDirectory, pagePath))) {
    throw new Error("app/page.tsx not found.");
  }

  const page = await readFile(
    projectDirectory,
    pagePath
  );

  const component = `"use client";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Product Manager",
    quote:
      "This platform completely changed the way our team works.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Founder",
    quote:
      "Simple, powerful, and incredibly easy to use.",
    rating: 5,
  },
  {
    name: "Emily Davis",
    role: "Designer",
    quote:
      "A beautiful experience from start to finish.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      className="px-6 py-20 bg-white"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What our customers say
          </h2>

          <p className="mt-4 text-gray-600">
            Trusted by people and teams building great products.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.name}
              className="rounded-2xl border border-gray-200 p-6 shadow-sm"
            >
              <div
                className="text-yellow-500"
                aria-label={\`\${testimonial.rating} out of 5 stars\`}
              >
                {"★".repeat(testimonial.rating)}
              </div>

              <p className="mt-4 text-gray-700">
                "{testimonial.quote}"
              </p>

              <div className="mt-6">
                <p className="font-semibold">
                  {testimonial.name}
                </p>
                <p className="text-sm text-gray-500">
                  {testimonial.role}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

  const changes: FileChange[] = [
    {
      path: "components/Testimonials.tsx",
      content: component,
    },
  ];

  let updatedPage = page;

  if (
    !updatedPage.includes(
      'import Testimonials from "../components/Testimonials"'
    )
  ) {
    updatedPage =
      `import Testimonials from "../components/Testimonials";\n` +
      updatedPage;
  }

  const markerPatterns = [
    /<Features\s*\/>/,
    /<Features\s*[^>]*\/>/,
  ];

  let inserted = false;

  for (const pattern of markerPatterns) {
    if (pattern.test(updatedPage)) {
      updatedPage = updatedPage.replace(
        pattern,
        (match) => `${match}\n      <Testimonials />`
      );

      inserted = true;
      break;
    }
  }

  if (!inserted) {
    // Fallback: insert before Footer.
    updatedPage = updatedPage.replace(
      /(<Footer\s*\/>)/,
      `      <Testimonials />\n      $1`
    );
  }

  changes.push({
    path: pagePath,
    content: updatedPage,
  });

  return changes;
}

async function removeSection(
  projectDirectory: string,
  instruction: string
): Promise<FileChange[]> {
  const pagePath = "app/page.tsx";

  if (!(await fileExists(projectDirectory, pagePath))) {
    throw new Error("app/page.tsx not found.");
  }

  const page = await readFile(
    projectDirectory,
    pagePath
  );

  let section: string | null = null;

  if (instruction.includes("pricing")) {
    section = "Pricing";
  } else if (instruction.includes("about")) {
    section = "About";
  } else if (instruction.includes("features")) {
    section = "Features";
  } else if (instruction.includes("testimonials")) {
    section = "Testimonials";
  } else if (instruction.includes("hero")) {
    section = "Hero";
  }

  if (!section) {
    throw new Error(
      "Local fallback could not determine which section to remove."
    );
  }

  const componentPattern = new RegExp(
    `\\s*<${section}\\b[^>]*\\/?>`,
    "g"
  );

  let updated = page.replace(
    componentPattern,
    "\n"
  );

  const importPattern = new RegExp(
    `import\\s+${section}\\s+from\\s+["'][^"']+["'];?\\s*\\n?`,
    "g"
  );

  updated = updated.replace(
    importPattern,
    ""
  );

  const changes: FileChange[] = [];

  if (updated !== page) {
    changes.push({
      path: pagePath,
      content: updated,
    });
  }

  const componentPath =
    `components/${section}.tsx`;

  if (
    await fileExists(
      projectDirectory,
      componentPath
    )
  ) {
    // The component can remain unused safely.
    // We intentionally don't delete it in this first fallback.
  }

  return changes;
}

export async function localModifyProject(
  context: LocalModificationContext
): Promise<ModificationResult> {
  const instruction = normalizeInstruction(
    context.instruction
  );

  try {
    let changes: FileChange[] = [];
    let explanation = "";

    if (
      instruction.includes("primary color") ||
      instruction.includes("primary colour")
    ) {
      changes = await modifyPrimaryColor(
        context.projectDirectory,
        instruction
      );

      explanation =
        "Applied the requested primary color change using the local modification engine.";
    } else if (
      instruction.includes("sticky") &&
      instruction.includes("navbar")
    ) {
      changes = await makeNavbarSticky(
        context.projectDirectory
      );

      explanation =
        "Made the navbar sticky using the local modification engine.";
    } else if (
      instruction.includes("add") &&
      instruction.includes("testimonial")
    ) {
      changes = await addTestimonials(
        context.projectDirectory
      );

      explanation =
        "Added a testimonials section using the local modification engine.";
    } else if (
      instruction.includes("remove") &&
      (
        instruction.includes("section") ||
        instruction.includes("pricing") ||
        instruction.includes("about") ||
        instruction.includes("features") ||
        instruction.includes("testimonials")
      )
    ) {
      changes = await removeSection(
        context.projectDirectory,
        instruction
      );

      explanation =
        "Removed the requested section using the local modification engine.";
    } else {
      return {
        success: false,
        explanation:
          "The local modification engine does not support this instruction yet.",
        changes: [],
      };
    }
    if (changes.length === 0) {
        return {
            success: false,
            explanation: "The requested change is already present, so no files need to be modified.",
            changes: []
        };
    }

    return {
      success: true,
      explanation,
      changes,
    };
  } catch (error) {
    return {
      success: false,
      explanation:
        error instanceof Error
          ? error.message
          : "Local modification failed.",
      changes: [],
    };
  }
}