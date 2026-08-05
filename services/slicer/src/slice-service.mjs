import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { runPrusaSlicer } from "./prusa-runner.mjs";

export const DEFAULT_PROFILE_PATH =
  process.env.BIQU_B1_PROFILE_PATH ??
  "/opt/forja-slicer/smoke-test/biqu-b1-smoke.ini";

function sanitizeBaseName(fileName) {
  const originalBaseName = basename(fileName, ".stl");

  const sanitized = originalBaseName
  .normalize("NFKD")
  .replace(/\p{M}+/gu, "")
  .replace(/[^\w.-]+/g, "-");

  return sanitized || "modelo";
}

export async function sliceUploadedModel({
  file,
  settings,
  requestId,
  profilePath = DEFAULT_PROFILE_PATH,
  runSlicer = runPrusaSlicer,
}) {
  const workspace = await mkdtemp(
    join(tmpdir(), `forja-slicer-${requestId}-`),
  );

  const safeBaseName = sanitizeBaseName(file.name);
  const inputPath = join(workspace, `${safeBaseName}.stl`);
  const outputPath = join(workspace, `${safeBaseName}.gcode`);

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await writeFile(inputPath, fileBuffer, {
      flag: "wx",
    });

    const result = await runSlicer({
      inputPath,
      outputPath,
      profilePath,
      settings,
    });

    const gcode = await readFile(result.outputPath);

    return {
      gcode,
      fileName: `${safeBaseName}.gcode`,
      sizeBytes: result.sizeBytes,
    };
  } finally {
    await rm(workspace, {
      recursive: true,
      force: true,
    });
  }
}
