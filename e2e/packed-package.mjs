import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".packed-test");
const fixture = join(output, "consumer");
const packagePath = join(fixture, "node_modules/@nitro-bio/sequence-viewers");
await mkdir(output, { recursive: true });
await rm(fixture, { recursive: true, force: true });
await mkdir(packagePath, { recursive: true });
// Read the tarball that consumers receive, without a source alias or workspace link.
const packed = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", output],
    { cwd: root, encoding: "utf8" },
  ),
);
execFileSync("tar", [
  "-xzf",
  join(output, packed[0].filename),
  "--strip-components=1",
  "-C",
  packagePath,
]);
const manifest = JSON.parse(
  await readFile(join(packagePath, "package.json"), "utf8"),
);
for (const key of [
  "./styles.css",
  "./dist/nitro.css",
  "./dist/nitro-sequence-viewers.css",
]) {
  if (manifest.exports[key] !== "./dist/nitro-sequence-viewers.css")
    throw new Error(`Incorrect stylesheet export: ${key}`);
}
if (JSON.stringify(manifest.sideEffects) !== JSON.stringify(["**/*.css"]))
  throw new Error("CSS side effects must be retained");
if (
  manifest.peerDependencies.react !== "^18.2.0 || ^19.0.0" ||
  manifest.peerDependencies["react-dom"] !== "^18.2.0 || ^19.0.0"
)
  throw new Error("React peer contract changed");
if (manifest.dependencies.react || manifest.dependencies["react-dom"])
  throw new Error("React must remain a peer");
if (
  Object.keys(manifest.dependencies).some((name) =>
    name.includes("tailwindcss"),
  )
) {
  throw new Error(
    "Tailwind build tooling must remain a development dependency",
  );
}
const browserBundle = await readFile(
  join(packagePath, "dist/nitro-sequence-viewers.es.js"),
  "utf8",
);
if (/process\.env|Generated unique file name/.test(browserBundle))
  throw new Error("Browser bundle contains removed runtime globals/logging");
const declaration = await readFile(
  join(
    packagePath,
    "dist/components/Ariadne/SequenceViewer/SequenceViewer.d.ts",
  ),
  "utf8",
);
for (const publicProp of [
  "enableAlignment",
  "alignmentConfig",
  "validationMode",
  "annotations?",
]) {
  if (!declaration.includes(publicProp))
    throw new Error(`Missing public declaration: ${publicProp}`);
}
await cp(join(root, "e2e/consumer.tsx"), join(fixture, "main.tsx"));
await writeFile(
  join(fixture, "index.html"),
  '<!doctype html><html><head><meta charset="UTF-8"><title>Packed viewer consumer</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
);
await writeFile(
  join(fixture, "package.json"),
  JSON.stringify({ private: true, type: "module" }),
);
execFileSync(
  process.execPath,
  [
    require.resolve("typescript/bin/tsc"),
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
  ],
  { cwd: root, stdio: "inherit" },
);
const common = `:root { --color-emerald-700: rgb(111, 22, 33); --color-zinc-800: rgb(23, 34, 45); --font-mono: 'Courier New'; --spacing: 9px; }
body { background: #fff; color: #17212b; }
main { max-width: 920px; margin: 24px auto; }
section { margin-bottom: 24px; }
#host { padding: 15px; border: 2px solid #87929d; }
[data-testid="host-theme"] { color: var(--color-emerald-700); font-family: var(--font-mono); padding: var(--spacing); }
.caller-char { color: #0f766e; }
.caller-annotation { background: #fbbf24; fill: #fbbf24; }
.caller-selection { outline: 1px solid #0f766e; }
.caller-container { border: 1px solid #cbd5e1; }
`;
const publicDir = join(fixture, "public");
await mkdir(publicDir);
await writeFile(join(publicDir, "host-plain.css"), common);
await writeFile(
  join(fixture, "host-v3-input.css"),
  "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n" + common,
);
await writeFile(
  join(fixture, "tailwind-v3.cjs"),
  `module.exports = { content: [${JSON.stringify(join(fixture, "main.tsx"))}] };`,
);
execFileSync(
  process.execPath,
  [
    require.resolve("tailwindcss-v3/lib/cli.js"),
    "-i",
    join(fixture, "host-v3-input.css"),
    "-o",
    join(publicDir, "host-tailwind3.css"),
    "-c",
    join(fixture, "tailwind-v3.cjs"),
  ],
  { cwd: root, stdio: "inherit" },
);
await writeFile(
  join(fixture, "host-v4-input.css"),
  '@import "tailwindcss" source(none);\n@source "./main.tsx";\n' + common,
);
const cli = join(
  dirname(require.resolve("@tailwindcss/cli/package.json")),
  "dist/index.mjs",
);
execFileSync(
  process.execPath,
  [
    cli,
    "-i",
    join(fixture, "host-v4-input.css"),
    "-o",
    join(publicDir, "host-tailwind4.css"),
  ],
  { cwd: root, stdio: "inherit" },
);
// Verify all CSS imports through Vite resolution as well as the manifest assertions.
for (const [index, subpath] of [
  "styles.css",
  "dist/nitro.css",
  "dist/nitro-sequence-viewers.css",
].entries()) {
  await writeFile(
    join(fixture, `alias-${index}.js`),
    `import "@nitro-bio/sequence-viewers/${subpath}";`,
  );
}
await cp(
  join(packagePath, "dist/nitro-sequence-viewers.css"),
  join(publicDir, "library.css"),
);
try {
  await readdir(join(output, "assets"));
  await cp(join(output, "assets"), join(publicDir, "assets"), {
    recursive: true,
  });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await build({
  configFile: false,
  root: fixture,
  plugins: [react()],
  build: {
    outDir: join(output, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: join(fixture, "index.html"),
        alias0: join(fixture, "alias-0.js"),
        alias1: join(fixture, "alias-1.js"),
        alias2: join(fixture, "alias-2.js"),
      },
    },
  },
});
// Exercise the second supported React peer major without adding React to the
// published runtime dependencies. All React entrypoints share the same alias.
await build({
  configFile: false,
  root: fixture,
  base: "/react19/",
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^react(?=\/|$)/,
        replacement: dirname(
          require.resolve("react/package.json", {
            paths: [join(root, "e2e/react19")],
          }),
        ),
      },
      {
        find: /^react-dom(?=\/|$)/,
        replacement: dirname(
          require.resolve("react-dom/package.json", {
            paths: [join(root, "e2e/react19")],
          }),
        ),
      },
    ],
  },
  build: { outDir: join(output, "dist/react19"), emptyOutDir: true },
});
console.log(
  `Verified packed artifact ${packed[0].filename}; consumer built at ${output}/dist`,
);
