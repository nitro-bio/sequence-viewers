import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".packed-test/assets");
const source = "https://biowasm.com/cdn/v3";
const assets = [
  [
    "coreutils/8.32/cat.js",
    "2feea118c9d89c3faec6f15f48ffa5537d3224aed6dceaa01cacd5c1cb53bba5",
  ],
  [
    "coreutils/8.32/cat.wasm",
    "47065e3678f0559c92fae12cfa6497ab89ab380a3f19ca716346c570e3d3885a",
  ],
  [
    "mafft/7.520/tbfast.js",
    "cd94dc2b5d4bea9ca75098fe640d458c9bda5e7ff4461a1dc61467ba3b1bf8ca",
  ],
  [
    "mafft/7.520/tbfast.wasm",
    "eff412468e302a01acd3aa19aaa1b92a1b7224b695f7e16efaab5052d5bab2e8",
  ],
  [
    "mafft/7.520/dvtditr.js",
    "9b98102b4b7d8cd62c65c173e1106bb3cd661c1a73cb58373e323f66d2703827",
  ],
  [
    "mafft/7.520/dvtditr.wasm",
    "8329fad2bedd2e2fb07c9d961388b6b6aa04d72a329418e9f9c2a157b7cb8b88",
  ],
];

await Promise.all(
  assets.map(async ([asset, expectedSha256]) => {
    const response = await fetch(`${source}/${asset}`);
    if (!response.ok) {
      throw new Error(`Could not download ${asset}: HTTP ${response.status}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      asset.endsWith(".wasm") &&
      ![0x00, 0x61, 0x73, 0x6d].every((byte, index) => bytes[index] === byte)
    ) {
      throw new Error(`${asset} is not a WebAssembly binary`);
    }
    if (asset.endsWith(".js") && bytes.length === 0) {
      throw new Error(`${asset} is empty`);
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== expectedSha256) {
      throw new Error(`${asset} did not match its pinned SHA-256`);
    }

    const destination = join(output, asset);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }),
);

console.log(`Prepared ${assets.length} pinned alignment assets in ${output}`);
