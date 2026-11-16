import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, release } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const playground = fileURLToPath(new URL("..", import.meta.url));
const order = process.env.DRAG_EXPERIMENT_ORDER;
if (order !== "full-first" && order !== "shell-first") throw new Error("DRAG_EXPERIMENT_ORDER must be full-first or shell-first");
const output = resolve(playground, "experiment-results");
mkdirSync(output); // Refuse to overwrite an earlier experiment.
const full = "chromium-headless", shell = "chromium-headless-shell";
const controls = order === "full-first" ? [full, shell] : [shell, full];
const plan = [
  ...controls.map(project => ({ name: `control-${project}`, project, disableGpu: false, trace: false })),
  { name: "gpu-disabled", project: full, disableGpu: true, trace: false },
  { name: "gpu-restored", project: full, disableGpu: false, trace: false },
  { name: "trace-default", project: full, disableGpu: false, trace: true },
  { name: "trace-disabled", project: full, disableGpu: true, trace: true },
  { name: "trace-shell", project: shell, disableGpu: false, trace: true },
];
const hash = path => createHash("sha256").update(readFileSync(new URL(path, import.meta.url))).digest("hex");
const manifest = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: playground, encoding: "utf8" }).trim(),
  lockfileSha256: hash("../../../pnpm-lock.yaml"), fixtureSha256: hash("./fixtures/reference-tree.json"),
  platform: process.platform, architecture: process.arch, os: release(), cpu: cpus()[0]?.model,
  runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT,
  order, repetitions: 2, retries: 0, budgetMs: 100, plan, results: [],
};
const save = () => writeFileSync(resolve(output, "manifest.json"), JSON.stringify(manifest, null, 2));
save();
let failed = false;
for (const phase of plan) {
  const args = ["exec", "playwright", "test", "--config", "playwright.latency.config.ts",
    `--project=${phase.project}`, `--output=${resolve(output, phase.name)}`];
  // Traces are exploratory baselines; complete untraced suites retain every audit and budget assertion.
  if (phase.trace) args.push("--grep", "style-observer=false delay=0");
  const started = new Date().toISOString();
  console.log(`Starting ${phase.name} (${started})`);
  const log = openSync(resolve(output, `${phase.name}.log`), "wx");
  let result;
  try {
    result = spawnSync("pnpm", args, {
      cwd: playground,
      env: { ...process.env, DRAG_LATENCY_REPETITIONS: "2",
        DRAG_DIAGNOSTIC_DISABLE_GPU: phase.disableGpu ? "1" : "0", DRAG_DIAGNOSTIC_TRACE: phase.trace ? "1" : "0" },
      stdio: ["ignore", log, log],
    });
  } finally { closeSync(log); }
  manifest.results.push({ ...phase, args, started, finished: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, error: result.error?.message, completeAuditAndBudget: !phase.trace });
  save();
  console.log(`Finished ${phase.name}: exit=${result.status}, signal=${result.signal}`);
  if (result.error || result.signal) throw new Error(`Could not complete ${phase.name}; see manifest and log`);
  if (result.status !== 0) failed = true;
}
// Keep all preplanned phases after a budget failure, then fail the job visibly.
process.exitCode = failed ? 1 : 0;
