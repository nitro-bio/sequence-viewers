import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { buildPackedExamples } from "../scripts/test-packed-examples.mjs";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".packed-test");
const fixture = join(output, "consumer");
const publicDir = join(fixture, "public");
const packagePath = join(fixture, "node_modules/@nitro-bio/sequence-viewers");
const runNode = (script, args) =>
  execFileSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
  });
await rm(fixture, { recursive: true, force: true });
await mkdir(packagePath, { recursive: true });
await mkdir(publicDir);

// Build against the published tarball, including its exports and declarations.
const [packed] = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", output],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NPM_CONFIG_CACHE: join(output, "npm-cache") },
    },
  ),
);
execFileSync("tar", [
  "-xzf",
  join(output, packed.filename),
  "--strip-components=1",
  "-C",
  packagePath,
]);
await cp(join(root, "e2e/consumer.tsx"), join(fixture, "main.tsx"));
await cp(join(root, "e2e/index.html"), join(fixture, "index.html"));
await writeFile(
  join(fixture, "package.json"),
  JSON.stringify({ private: true, type: "module" }),
);
runNode(require.resolve("typescript/bin/tsc"), [
  "--noEmit",
  "--strict",
  "--skipLibCheck",
  "--jsx",
  "react-jsx",
  "--module",
  "ESNext",
  "--moduleResolution",
  "Bundler",
  "--target",
  "ES2022",
  join(fixture, "main.tsx"),
]);

const hostCss = await readFile(join(root, "e2e/host.css"), "utf8");
await writeFile(join(publicDir, "host-plain.css"), hostCss);
await writeFile(
  join(fixture, "host-v3.css"),
  "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n" + hostCss,
);
await writeFile(
  join(fixture, "tailwind-v3.cjs"),
  `module.exports = { content: [${JSON.stringify(join(fixture, "main.tsx"))}] };`,
);
runNode(require.resolve("tailwindcss-v3/lib/cli.js"), [
  "-i",
  join(fixture, "host-v3.css"),
  "-o",
  join(publicDir, "host-tailwind3.css"),
  "-c",
  join(fixture, "tailwind-v3.cjs"),
]);
await writeFile(
  join(fixture, "host-v4.css"),
  '@import "tailwindcss" source(none);\n@source "./main.tsx";\n' + hostCss,
);
runNode(
  join(
    dirname(require.resolve("@tailwindcss/cli/package.json")),
    "dist/index.mjs",
  ),
  [
    "-i",
    join(fixture, "host-v4.css"),
    "-o",
    join(publicDir, "host-tailwind4.css"),
  ],
);
await cp(
  join(packagePath, "dist/nitro-sequence-viewers.css"),
  join(publicDir, "library.css"),
);
await cp(join(output, "assets"), join(publicDir, "assets"), {
  recursive: true,
});

// Exercise all stylesheet export aliases through the consumer bundler.
const input = { index: join(fixture, "index.html") };
for (const [index, subpath] of [
  "styles.css",
  "dist/nitro.css",
  "dist/nitro-sequence-viewers.css",
].entries()) {
  input[`alias${index}`] = join(fixture, `alias-${index}.js`);
  await writeFile(
    input[`alias${index}`],
    `import "@nitro-bio/sequence-viewers/${subpath}";`,
  );
}
for (const major of [18, 19]) {
  const base = major === 18 ? "/" : "/react19/";
  await build({
    configFile: false,
    root: fixture,
    base,
    plugins: [react()],
    resolve: {
      alias:
        major === 18
          ? []
          : ["react", "react-dom"].map((name) => ({
              find: new RegExp(`^${name}(?=/|$)`),
              replacement: dirname(
                require.resolve(`${name}/package.json`, {
                  paths: [join(root, "e2e/react19")],
                }),
              ),
            })),
    },
    build: {
      outDir: join(output, "dist", base),
      emptyOutDir: true,
      rollupOptions: { input },
    },
  });
}
await buildPackedExamples({
  root,
  outputDirectory: output,
  tarball: join(output, packed.filename),
  packageVersion: packed.version,
});
console.log(`Packed consumer ready: ${packed.filename}`);
