import { spawn } from "child_process";

export interface BuildResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  output: string;
  durationMs: number;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        USER: process.env.USER,
        LANG: process.env.LANG,
        LC_ALL: process.env.LC_ALL,
        CI: "1",
        NODE_ENV: "production",
        },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (exitCode) => {
      resolve({
        exitCode,
        stdout,
        stderr,
      });
    });
  });
}

export async function validateGeneratedProject(
  projectDirectory: string
): Promise<BuildResult> {
  const startedAt = Date.now();

  console.log(
    `[Validator] Installing dependencies in ${projectDirectory}`
  );

  const install = await runCommand(
    "npm",
    ["install", "--no-audit", "--no-fund"],
    projectDirectory
  );

  if (install.exitCode !== 0) {
    const output = [
      install.stdout,
      install.stderr,
    ].join("\n");

    return {
      success: false,
      exitCode: install.exitCode,
      stdout: install.stdout,
      stderr: install.stderr,
      output,
      durationMs: Date.now() - startedAt,
    };
  }

  console.log("[Validator] Dependencies installed.");

  console.log("[Validator] Running production build...");

  const build = await runCommand(
    "npm",
    ["run", "build"],
    projectDirectory
  );

  const output = [
    build.stdout,
    build.stderr,
  ].join("\n");

  const success = build.exitCode === 0;

  console.log(
    success
      ? "[Validator] Build succeeded."
      : "[Validator] Build failed."
  );

  return {
    success,
    exitCode: build.exitCode,
    stdout: build.stdout,
    stderr: build.stderr,
    output,
    durationMs: Date.now() - startedAt,
  };
}