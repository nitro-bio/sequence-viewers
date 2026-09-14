import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALIGNMENT_ASSETS,
  prepareAlignmentAssets,
} from "../scripts/prepare-alignment-assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { destinationRoot, downloaded, reused } = await prepareAlignmentAssets({
  outputDirectory: join(root, ".packed-test/assets"),
});

console.log(
  `Prepared ${ALIGNMENT_ASSETS.length} pinned alignment assets in ${destinationRoot} (${downloaded} downloaded, ${reused} already verified)`,
);
