import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".packed-test/benchmark");
await rm(output, { recursive: true, force: true });
const packageDir = join(output, "node_modules/@nitro-bio/sequence-viewers");
await mkdir(packageDir, { recursive: true });
const [packed] = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", output],
    { cwd: root, encoding: "utf8" },
  ),
);
execFileSync("tar", [
  "-xzf",
  join(output, packed.filename),
  "--strip-components=1",
  "-C",
  packageDir,
]);
await cp(join(root, "benchmarks/consumer.tsx"), join(output, "consumer.tsx"));
await cp(join(root, "benchmarks/index.html"), join(output, "index.html"));
await writeFile(
  join(output, "package.json"),
  JSON.stringify({ private: true, type: "module" }),
);
await build({
  configFile: false,
  root: output,
  plugins: [react()],
  build: { outDir: join(output, "dist"), emptyOutDir: true },
});
const server = await preview({
  configFile: false,
  root: output,
  preview: { host: "127.0.0.1", port: 4181, strictPort: true },
});
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const report = {
  version: pkg.version,
  date: new Date().toISOString(),
  environment: {
    os: `${platform()} ${release()}`,
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    ramGiB: Math.round(totalmem() / 1024 ** 3),
    node: process.version,
    viewport: "1100x900",
    react: "18.3.1",
    cpuThrottling: "none",
    browser: "",
  },
  trials: [],
};
const cases = [
  { rows: 1, length: 1000 },
  { rows: 1, length: 10000 },
  { rows: 10, length: 1000 },
  { rows: 100, length: 1000 },
  { rows: 1, length: 100000 },
];
const repetitions = Number(process.env.BENCHMARK_RUNS ?? 3);
try {
  for (const workload of cases) {
    for (let trial = 1; trial <= repetitions; trial++) {
      const browser = await chromium.launch();
      report.environment.browser = await browser.version();
      try {
        const page = await browser.newPage({
          viewport: { width: 1100, height: 900 },
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          `http://127.0.0.1:4181/?rows=${workload.rows}&length=${workload.length}`,
          { waitUntil: "commit", timeout: 30000 },
        );
        await page
          .locator("#result")
          .filter({ hasText: "mountMs" })
          .waitFor({ timeout: 30000 });
        const measured = JSON.parse(
          await page.locator("#result").textContent(),
        );
        const result = { trial, ...measured, errors };
        if (measured.selectedCells !== workload.rows)
          throw new Error(
            `Expected ${workload.rows} selected cells; saw ${measured.selectedCells}`,
          );
        report.trials.push(result);
        console.log(JSON.stringify(result));
      } catch (error) {
        const result = { ...workload, trial, error: error.message };
        report.trials.push(result);
        console.log(JSON.stringify(result));
      } finally {
        await browser.close();
      }
    }
  }
} finally {
  await new Promise((done) => server.httpServer.close(done));
  await writeFile(
    join(output, "results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(`Results: ${join(output, "results.json")}`);
}
