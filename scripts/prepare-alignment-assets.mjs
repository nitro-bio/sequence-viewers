#!/usr/bin/env node

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_ALIGNMENT_ASSET_SOURCE = "https://biowasm.com/cdn/v3";

export const ALIGNMENT_ASSETS = Object.freeze([
  {
    path: "coreutils/8.32/cat.js",
    sha256: "2feea118c9d89c3faec6f15f48ffa5537d3224aed6dceaa01cacd5c1cb53bba5",
  },
  {
    path: "coreutils/8.32/cat.wasm",
    sha256: "47065e3678f0559c92fae12cfa6497ab89ab380a3f19ca716346c570e3d3885a",
  },
  {
    path: "mafft/7.520/tbfast.js",
    sha256: "cd94dc2b5d4bea9ca75098fe640d458c9bda5e7ff4461a1dc61467ba3b1bf8ca",
  },
  {
    path: "mafft/7.520/tbfast.wasm",
    sha256: "eff412468e302a01acd3aa19aaa1b92a1b7224b695f7e16efaab5052d5bab2e8",
  },
  {
    path: "mafft/7.520/dvtditr.js",
    sha256: "9b98102b4b7d8cd62c65c173e1106bb3cd661c1a73cb58373e323f66d2703827",
  },
  {
    path: "mafft/7.520/dvtditr.wasm",
    sha256: "8329fad2bedd2e2fb07c9d961388b6b6aa04d72a329418e9f9c2a157b7cb8b88",
  },
]);

function checksum(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertAsset(path, bytes, expectedSha256) {
  if (
    path.endsWith(".wasm") &&
    ![0x00, 0x61, 0x73, 0x6d].every((byte, index) => bytes[index] === byte)
  ) {
    throw new Error(`${path} is not a WebAssembly binary`);
  }
  if (path.endsWith(".js") && bytes.length === 0) {
    throw new Error(`${path} is empty`);
  }
  if (checksum(bytes) !== expectedSha256) {
    throw new Error(`${path} did not match its pinned SHA-256`);
  }
}

export async function prepareAlignmentAssets({
  outputDirectory,
  sourceUrl = DEFAULT_ALIGNMENT_ASSET_SOURCE,
  fetchAsset = fetch,
}) {
  const destinationRoot = resolve(outputDirectory);
  const sourceRoot = sourceUrl.replace(/\/+$/, "");
  let downloaded = 0;
  let reused = 0;

  await Promise.all(
    ALIGNMENT_ASSETS.map(async ({ path, sha256 }) => {
      const destination = resolve(destinationRoot, path);
      if (!destination.startsWith(`${destinationRoot}${sep}`)) {
        throw new Error(`Invalid asset path: ${path}`);
      }

      try {
        await access(destination);
        const existing = await readFile(destination);
        assertAsset(path, existing, sha256);
        reused += 1;
        return;
      } catch {
        // Missing or stale files are replaced from the pinned source below.
      }

      const response = await fetchAsset(`${sourceRoot}/${path}`);
      if (!response.ok) {
        throw new Error(`Could not download ${path}: HTTP ${response.status}`);
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      assertAsset(path, bytes, sha256);
      await mkdir(dirname(destination), { recursive: true });
      const temporary = `${destination}.tmp-${process.pid}`;
      try {
        await writeFile(temporary, bytes);
        await rename(temporary, destination);
      } finally {
        await rm(temporary, { force: true });
      }
      downloaded += 1;
    }),
  );

  return { destinationRoot, downloaded, reused };
}

function usage() {
  return [
    "Usage: node scripts/prepare-alignment-assets.mjs [output-directory]",
    "",
    "Downloads and verifies the exact MAFFT 7.520 and Coreutils 8.32 assets",
    "required by browser alignment. The default output is public/biowasm.",
  ].join("\n");
}

const isDirectInvocation =
  process.argv[1] &&
  realpathSync(process.argv[1]) ===
    realpathSync(fileURLToPath(import.meta.url));

if (isDirectInvocation) {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
  } else if (process.argv.length > 3) {
    console.error(usage());
    process.exitCode = 1;
  } else {
    const outputDirectory = process.argv[2] ?? "public/biowasm";
    const result = await prepareAlignmentAssets({ outputDirectory });
    console.log(
      `Prepared ${ALIGNMENT_ASSETS.length} pinned alignment assets in ${result.destinationRoot} (${result.downloaded} downloaded, ${result.reused} already verified)`,
    );
  }
}
