"use client";

import { useState } from "react";

interface Analysis {
  url: string;
  finalUrl: string;
  title: string;
  meta: {
    description: string;
  };
  headings: {
    level: string;
    text: string;
  }[];
  paragraphs: string[];
  navigation: {
    text: string;
    href: string;
  }[];
  links: {
    text: string;
    href: string;
  }[];
  images: {
    alt: string;
    src: string;
  }[];
  buttons: string[];
  sections: {
    tag: string;
    text: string;
  }[];
  theme: {
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  screenshots: {
    desktop: string;
    mobile: string;
  };
}

interface AnalyzeResponse {
  analysis: Analysis;
  pageSpec: unknown;
}

interface GenerateResponse {
  success: boolean;
  generator?: "gemini" | "local";
  projectName?: string;
  fileCount?: number;
  projectDirectory?: string;
  validation?: {
    success: boolean;
    exitCode?: number;
    durationMs?: number;
    repairAttempts?: number;
    repairExplanations?: string[];
  };
  files?: string[];
  buildError?: string;
  error?: string;
}

interface ModifyResponse {
  success: boolean;
  agent?: "gemini" | "local";
  explanation?: string;
  filesChanged?: string[];
  validation?: {
    success: boolean;
    exitCode?: number;
    durationMs?: number;
  };
  error?: string;
}

type Status = "idle" | "analyzing" | "generating" | "ready" | "modifying";

export default function Home() {
  const [url, setUrl] = useState("");

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [pageSpec, setPageSpec] =
    useState<unknown>(null);

  const [generation, setGeneration] =
    useState<GenerateResponse | null>(null);

  const [modification, setModification] =
    useState<ModifyResponse | null>(null);

  const [instruction, setInstruction] =
    useState("");

  const [status, setStatus] =
    useState<Status>("idle");

  const [error, setError] =
    useState("");

  async function handleClone() {
    if (!url.trim()) {
      setError("Please enter a website URL.");
      return;
    }

    setError("");
    setAnalysis(null);
    setPageSpec(null);
    setGeneration(null);
    setModification(null);

    try {
      /*
       * -----------------------------------------
       * 1. ANALYZE WEBSITE
       * -----------------------------------------
       */

      setStatus("analyzing");

      const analyzeResponse = await fetch(
        "/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url.trim(),
          }),
        }
      );

      const analyzeData: AnalyzeResponse & {
        error?: string;
      } = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(
          analyzeData.error ||
            "Website analysis failed."
        );
      }

      setAnalysis(analyzeData.analysis);
      setPageSpec(analyzeData.pageSpec);

      /*
       * -----------------------------------------
       * 2. GENERATE WEBSITE
       * -----------------------------------------
       */

      setStatus("generating");

      const generateResponse = await fetch(
        "/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageSpec: analyzeData.pageSpec,
          }),
        }
      );

      const generateData: GenerateResponse =
        await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(
          generateData.error ||
            "Website generation failed."
        );
      }

      if (!generateData.success) {
        throw new Error(
          generateData.error ||
            "Generated project failed."
        );
      }

      setGeneration(generateData);
      setStatus("ready");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

      setStatus("idle");
    }
  }

  async function handleModify() {
    if (!generation?.projectDirectory) {
      setError(
        "Generate a website before modifying it."
      );
      return;
    }

    if (!instruction.trim()) {
      setError(
        "Enter a modification instruction."
      );
      return;
    }

    setError("");
    setModification(null);
    setStatus("modifying");

    try {
      const response = await fetch(
        "/api/modify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectDirectory:
              generation.projectDirectory,
            instruction: instruction.trim(),
          }),
        }
      );

      const data: ModifyResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Modification failed."
        );
      }

      if (!data.success) {
        throw new Error(
          data.explanation ||
            data.error ||
            "Modification failed."
        );
      }

      setModification(data);
      setInstruction("");
      setStatus("ready");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Modification failed."
      );

      setStatus("ready");
    }
  }

  const isBusy =
    status === "analyzing" ||
    status === "generating" ||
    status === "modifying";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* HEADER */}

        <header className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
            AI WEBSITE CLONING AGENT
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Clone any website with AI.
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Analyze a public website, generate a
            responsive Next.js frontend, validate
            the build, and modify it using natural
            language.
          </p>
        </header>

        {/* URL INPUT */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Website URL
          </label>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="url"
              value={url}
              onChange={(event) =>
                setUrl(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !isBusy
                ) {
                  handleClone();
                }
              }}
              placeholder="https://example.com"
              disabled={isBusy}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />

            <button
              onClick={handleClone}
              disabled={isBusy || !url.trim()}
              className="rounded-xl bg-blue-600 px-7 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "analyzing"
                ? "Analyzing..."
                : status === "generating"
                  ? "Generating..."
                  : "Clone Website"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
        </section>

        {/* PIPELINE STATUS */}

        {(isBusy || generation) && (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">
              Agent Pipeline
            </h2>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <PipelineStep
                label="Analyze"
                active={
                  status === "analyzing"
                }
                complete={!!analysis}
              />

              <PipelineStep
                label="PageSpec"
                active={false}
                complete={!!pageSpec}
              />

              <PipelineStep
                label="Generate"
                active={
                  status === "generating"
                }
                complete={!!generation}
              />

              <PipelineStep
                label="Validate"
                active={false}
                complete={
                  generation?.validation?.success ===
                  true
                }
              />
            </div>
          </section>
        )}

        {/* ANALYSIS */}

        {analysis && (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                  Website Analysis
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  {analysis.title ||
                    "Untitled website"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {analysis.finalUrl}
                </p>
              </div>

              <div className="rounded-lg bg-zinc-950 px-4 py-3 text-sm">
                <span className="text-zinc-500">
                  Sections{" "}
                </span>
                <span className="font-semibold">
                  {analysis.sections.length}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Headings"
                value={analysis.headings.length}
              />

              <Stat
                label="Images"
                value={analysis.images.length}
              />

              <Stat
                label="Navigation"
                value={analysis.navigation.length}
              />

              <Stat
                label="Buttons"
                value={analysis.buttons.length}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 font-medium">
                  Theme
                </h3>

                <div className="space-y-2 text-sm">
                  <Info
                    label="Background"
                    value={
                      analysis.theme
                        .backgroundColor
                    }
                  />

                  <Info
                    label="Text"
                    value={
                      analysis.theme.textColor
                    }
                  />

                  <Info
                    label="Font"
                    value={
                      analysis.theme.fontFamily
                    }
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">
                  Navigation
                </h3>

                <div className="flex flex-wrap gap-2">
                  {analysis.navigation
                    .slice(0, 8)
                    .map((item, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                      >
                        {item.text ||
                          item.href}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SCREENSHOTS */}

        {analysis?.screenshots && (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                Source Website
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Responsive Reference
              </h2>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                <p className="mb-2 text-sm text-zinc-500">
                  Desktop — 1440px
                </p>

                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
                  <img
                    src={`data:image/png;base64,${analysis.screenshots.desktop}`}
                    alt="Desktop source website"
                    className="block w-full"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-zinc-500">
                  Mobile — 390px
                </p>

                <div className="mx-auto max-w-[300px] overflow-hidden rounded-xl border border-zinc-800 bg-black">
                  <img
                    src={`data:image/png;base64,${analysis.screenshots.mobile}`}
                    alt="Mobile source website"
                    className="block w-full"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* GENERATION RESULT */}

        {generation && (
          <section className="mt-6 rounded-2xl border border-emerald-900/50 bg-zinc-900 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                  Generated Website
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  {generation.projectName}
                </h2>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                Build Passed
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Generator"
                value={
                  generation.generator ||
                  "unknown"
                }
              />

              <Stat
                label="Files"
                value={
                  generation.fileCount || 0
                }
              />

              <Stat
                label="Repair Attempts"
                value={
                  generation.validation
                    ?.repairAttempts || 0
                }
              />

              <Stat
                label="Build"
                value={
                  generation.validation
                    ?.success
                    ? "Passed"
                    : "Failed"
                }
              />
            </div>

            <div className="mt-5 rounded-xl bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Generated Project
              </p>

              <p className="mt-2 break-all font-mono text-xs text-zinc-300">
                {generation.projectDirectory}
              </p>
            </div>
          </section>
        )}

        {/* MODIFICATION */}

        {generation?.projectDirectory && (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-purple-400">
                Natural Language Modification
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                Modify the generated website
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Describe a change in plain English.
                The agent will apply it and validate
                the resulting project.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <input
                value={instruction}
                onChange={(event) =>
                  setInstruction(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !isBusy
                  ) {
                    handleModify();
                  }
                }}
                placeholder="e.g. Make the navbar sticky at the top"
                disabled={isBusy}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-purple-500"
              />

              <button
                onClick={handleModify}
                disabled={
                  isBusy ||
                  !instruction.trim()
                }
                className="rounded-xl bg-purple-600 px-6 py-3 font-semibold hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "modifying"
                  ? "Applying..."
                  : "Apply Change"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Suggestion
                text="Make the navbar sticky at the top"
                onClick={() =>
                  setInstruction(
                    "Make the navbar sticky at the top of the page."
                  )
                }
              />

              <Suggestion
                text="Change the primary color to red"
                onClick={() =>
                  setInstruction(
                    "Change the primary color of the website to red."
                  )
                }
              />

              <Suggestion
                text="Add testimonials"
                onClick={() =>
                  setInstruction(
                    "Add a testimonials section."
                  )
                }
              />
            </div>

            {modification && (
              <div className="mt-5 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                <p className="font-medium text-emerald-400">
                  Modification successful
                </p>

                {modification.explanation && (
                  <p className="mt-1 text-sm text-zinc-300">
                    {modification.explanation}
                  </p>
                )}

                {modification.filesChanged &&
                  modification.filesChanged
                    .length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500">
                      Files changed:{" "}
                      {modification.filesChanged.join(
                        ", "
                      )}
                    </p>
                  )}
              </div>
            )}
          </section>
        )}

        {/* FOOTER */}

        <footer className="mt-10 border-t border-zinc-900 pt-6 text-center text-xs text-zinc-600">
          Website Cloning Agent · Next.js ·
          Playwright · Gemini
        </footer>
      </div>
    </main>
  );
}

/*
 * --------------------------------------------------
 * SMALL UI COMPONENTS
 * --------------------------------------------------
 */

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold capitalize">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 rounded-lg bg-zinc-950 px-3 py-2">
      <span className="text-zinc-500">
        {label}
      </span>

      <span className="max-w-[65%] truncate text-right text-zinc-300">
        {value || "—"}
      </span>
    </div>
  );
}

function PipelineStep({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        complete
          ? "border-emerald-900 bg-emerald-950/20"
          : active
            ? "border-blue-900 bg-blue-950/20"
            : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            complete
              ? "bg-emerald-400"
              : active
                ? "animate-pulse bg-blue-400"
                : "bg-zinc-700"
          }`}
        />

        <span className="text-sm font-medium">
          {label}
        </span>
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        {complete
          ? "Complete"
          : active
            ? "Running..."
            : "Waiting"}
      </p>
    </div>
  );
}

function Suggestion({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
    >
      {text}
    </button>
  );
}