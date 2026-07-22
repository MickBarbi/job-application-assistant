/**
 * PDF compilation service.
 *
 * Compiles LaTeX source to PDF by shelling out to a LaTeX engine (tectonic,
 * pdflatex, or xelatex). LaTeX is an external system dependency; if no engine
 * is installed, compilation is gracefully skipped and callers can still offer
 * the raw .tex for download.
 *
 * All artifacts are written under STORAGE_DIR. File writes and process spawns
 * are isolated here so the rest of the app stays free of Node-only concerns.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { env, type LatexEngine } from "@/lib/env";

export class PdfCompilationError extends Error {
  constructor(
    message: string,
    readonly log?: string
  ) {
    super(message);
    this.name = "PdfCompilationError";
  }
}

/** Result of a compilation attempt. */
export interface CompileResult {
  /** Absolute path to the produced PDF. */
  pdfPath: string;
  /** Path relative to STORAGE_DIR, suitable for persisting in the DB. */
  relativePath: string;
}

function run(
  cmd: string,
  args: string[],
  cwd: string
): Promise<{ code: number; output: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, { cwd });
    let output = "";
    child.stdout.on("data", (d) => (output += d.toString()));
    child.stderr.on("data", (d) => (output += d.toString()));
    child.on("error", () => resolvePromise({ code: 127, output }));
    child.on("close", (code) => resolvePromise({ code: code ?? 1, output }));
  });
}

/** Checks (once, memoised) whether the configured engine is on PATH. */
let engineAvailable: boolean | undefined;

export async function isLatexEngineAvailable(
  engine: LatexEngine = env.latexEngine
): Promise<boolean> {
  if (engineAvailable !== undefined) return engineAvailable;
  const probe = await run(engine, ["--version"], tmpdir());
  engineAvailable = probe.code === 0;
  return engineAvailable;
}

/** Reset the memoised availability probe (used in tests). */
export function _resetEngineProbe(): void {
  engineAvailable = undefined;
}

function engineArgs(engine: LatexEngine, jobName: string): string[] {
  if (engine === "tectonic") {
    return ["--outfmt", "pdf", "--keep-logs", "-o", ".", "input.tex"];
  }
  // pdflatex / xelatex
  return [
    "-interaction=nonstopmode",
    "-halt-on-error",
    `-jobname=${jobName}`,
    "input.tex",
  ];
}

/**
 * Compiles `latexSource` to a PDF stored at
 * `${STORAGE_DIR}/resumes/${id}.pdf`.
 *
 * @throws PdfCompilationError if the engine is unavailable or compilation fails.
 */
export async function compileLatexToPdf(
  latexSource: string,
  id: string,
  engine: LatexEngine = env.latexEngine
): Promise<CompileResult> {
  if (!(await isLatexEngineAvailable(engine))) {
    throw new PdfCompilationError(
      `LaTeX engine "${engine}" is not installed or not on PATH. ` +
        `Install it (e.g. tectonic) or download the .tex source instead.`
    );
  }

  const storageRoot = resolve(env.storageDir);
  const resumesDir = join(storageRoot, "resumes");
  await mkdir(resumesDir, { recursive: true });

  // Compile in an isolated temp working directory to avoid polluting storage
  // with .aux/.log files and to keep concurrent compiles independent.
  const workDir = join(storageRoot, ".build", id);
  await mkdir(workDir, { recursive: true });

  try {
    await writeFile(join(workDir, "input.tex"), latexSource, "utf8");

    const jobName = "resume";
    const result = await run(engine, engineArgs(engine, jobName), workDir);

    const producedPdf =
      engine === "tectonic"
        ? join(workDir, "input.pdf")
        : join(workDir, `${jobName}.pdf`);

    if (result.code !== 0 || !existsSync(producedPdf)) {
      throw new PdfCompilationError(
        "LaTeX compilation failed. See the log for details.",
        result.output.slice(-4000)
      );
    }

    const relativePath = join("resumes", `${id}.pdf`);
    const finalPath = join(storageRoot, relativePath);
    await writeFile(finalPath, await readFile(producedPdf));

    return { pdfPath: finalPath, relativePath };
  } finally {
    // Best-effort cleanup of the temp working directory.
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Reads a previously compiled PDF (relative path as stored in the DB). */
export async function readStoredPdf(relativePath: string): Promise<Buffer> {
  const full = join(resolve(env.storageDir), relativePath);
  return readFile(full);
}
