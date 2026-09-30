import { validateGeneratedProject } from "./build-validator";

async function main() {
  const result = await validateGeneratedProject(
    "./generated-sites/nova"
  );

  console.log("\n========== VALIDATION RESULT ==========\n");

  console.log({
    success: result.success,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });

  if (!result.success) {
    console.log("\n========== BUILD ERROR ==========\n");
    console.log(result.output);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});