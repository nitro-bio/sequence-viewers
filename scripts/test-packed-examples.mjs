#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareAlignmentAssets } from "./prepare-alignment-assets.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, cwd, environment = {}) {
  execFileSync(command, args, {
    cwd,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      ...environment,
    },
    stdio: "inherit",
  });
}

function runAndCapture(command, args, cwd, environment = {}) {
  const output = execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      ...environment,
    },
  });
  process.stdout.write(output);
  return output;
}

function isGeneratedExamplePath(source) {
  return (
    !source.endsWith(".tsbuildinfo") &&
    !source
      .split(sep)
      .some((part) =>
        ["node_modules", ".next", "dist", "biowasm"].includes(part),
      )
  );
}

export async function buildPackedExamples({
  root = repositoryRoot,
  outputDirectory = join(root, ".packed-test"),
  tarball,
  packageVersion,
}) {
  const packedTarball = isAbsolute(tarball) ? tarball : resolve(root, tarball);
  const examplesOutput = join(outputDirectory, "examples");

  await rm(examplesOutput, { recursive: true, force: true });
  await mkdir(examplesOutput, { recursive: true });

  for (const name of ["vite", "next"]) {
    const source = join(root, "examples", name);
    const destination = join(examplesOutput, name);
    await cp(source, destination, {
      recursive: true,
      filter: isGeneratedExamplePath,
    });

    const manifestPath = join(destination, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.dependencies["@nitro-bio/sequence-viewers"] =
      `file:${packedTarball}`;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    run(
      "npm",
      ["install", "--no-package-lock", "--no-audit", "--no-fund"],
      destination,
      { NPM_CONFIG_CACHE: join(outputDirectory, "npm-cache") },
    );

    const installedManifestPath = join(
      destination,
      "node_modules/@nitro-bio/sequence-viewers/package.json",
    );
    const installedRealPath = await realpath(installedManifestPath);
    if (!installedRealPath.startsWith(`${destination}${sep}`)) {
      throw new Error(`${name} resolved sequence-viewers outside its fixture`);
    }
    const installedManifest = JSON.parse(
      await readFile(installedManifestPath, "utf8"),
    );
    if (packageVersion && installedManifest.version !== packageVersion) {
      throw new Error(
        `${name} installed ${installedManifest.version}, expected packed ${packageVersion}`,
      );
    }
    const assetScript = "scripts/prepare-alignment-assets.mjs";
    if (!installedManifest.files?.includes(assetScript)) {
      throw new Error(
        "Packed package omitted the alignment asset preparation script",
      );
    }
    await access(join(dirname(installedManifestPath), assetScript));
    if (
      installedManifest.bin?.["nitro-sequence-assets"]?.replace(/^\.\//, "") !==
      assetScript
    ) {
      throw new Error("Packed package omitted the nitro-sequence-assets CLI");
    }

    await mkdir(join(destination, "public/biowasm"), { recursive: true });
    await cp(
      join(outputDirectory, "assets"),
      join(destination, "public/biowasm"),
      {
        recursive: true,
      },
    );
    const assetCliOutput = runAndCapture(
      "npm",
      ["run", "prepare:alignment-assets"],
      destination,
      { NPM_CONFIG_CACHE: join(outputDirectory, "npm-cache") },
    );
    if (!assetCliOutput.includes("0 downloaded, 6 already verified")) {
      throw new Error(
        "nitro-sequence-assets did not verify the copied alignment assets",
      );
    }
    run("npm", ["run", "build"], destination);
    await writeFile(
      join(destination, ".packed-artifact.json"),
      `${JSON.stringify({
        packageVersion: installedManifest.version,
        packagePath: relative(destination, installedRealPath),
      })}\n`,
    );
  }
}

async function pack(root, outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const [result] = JSON.parse(
    execFileSync(
      "npm",
      [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        outputDirectory,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          NPM_CONFIG_CACHE: join(outputDirectory, "npm-cache"),
        },
      },
    ),
  );
  return {
    tarball: join(outputDirectory, result.filename),
    version: result.version,
  };
}

const isDirectInvocation =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  const outputDirectory = join(repositoryRoot, ".packed-test");
  await prepareAlignmentAssets({
    outputDirectory: join(outputDirectory, "assets"),
  });
  const packed = await pack(repositoryRoot, outputDirectory);
  await buildPackedExamples({
    outputDirectory,
    tarball: packed.tarball,
    packageVersion: packed.version,
  });
  console.log(
    "Built Vite and Next.js examples against the packed npm artifact",
  );
}
