# Nitro Bio Sequence Viewers

React components for DNA, RNA, and protein sequences: residue-level comparison,
linear and circular annotation maps, selection, FASTA export, and optional
browser alignment. MIT licensed. Supports React 18.2+ and React 19, with compiled
CSS and no Tailwind requirement.

[Interactive documentation](https://docs.nitro.bio/SequenceViewer) ·
[Plain Markdown](https://docs.nitro.bio/SequenceViewer.md) ·
[Usage guide](docs/usage.md) · [Workloads and accessibility](docs/limits.md)

## Start here

```sh
npm install @nitro-bio/sequence-viewers
```

```tsx
"use client";

import { SequenceViewer } from "@nitro-bio/sequence-viewers";
import "@nitro-bio/sequence-viewers/styles.css";

export default function SequenceExample() {
  return <SequenceViewer sequences={["ATGACCTG", "ATGTCCTG"]} />;
}
```

This is a complete component. Selection is managed internally and residues have
default styling. To share selection with your application, pass `selection` and
`setSelection`. To customize residue classes, pass `charClassName`.

In Next.js App Router, keep the viewer import in a client component; the
stylesheet can live in the root layout. Complete, runnable examples are included:

- [Next.js App Router with React 19](examples/next/README.md)
- [Vite with React 18](examples/vite/README.md)

Both examples are built and exercised against the packed npm artifact in CI.

## Choose a viewer

| Component                                               | Use it for                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| [SequenceViewer](https://docs.nitro.bio/SequenceViewer) | Individual residues, annotations, selection, and comparing aligned rows. |
| [LinearViewer](https://docs.nitro.bio/LinearViewer)     | A linear overview linked to residue selection.                           |
| [CircularViewer](https://docs.nitro.bio/CircularViewer) | Circular maps and regions that cross the origin.                         |

The residue viewer automatically windows large inputs while keeping full
selection, copy, download, mismatch, and annotation behavior. Read the
[measurements and operating guidance](docs/limits.md) for the exact threshold
and remaining memory costs. Strings are rendered without biological alphabet validation;
coordinate and validation contracts are in the [usage guide](docs/usage.md).

## Optional alignment

Alignment is off by default. Viewing does not download alignment tools. Enable
it with `enableAlignment` and `setSequences`; the first Align action downloads
MAFFT JavaScript/WebAssembly and computes locally in a browser worker.

Use the [self-hosting recipe](docs/alignment-self-hosting.md) to prepare assets
for your own server. The [alignment reference](docs/issue-80/alignment.md) covers
asset versions, CSP/CORS settings, failure recovery, and worker limits.

## Styling and compatibility

Import `@nitro-bio/sequence-viewers/styles.css` once. The package does not reset
host styles. Customize `--nsv-color-sequences-*` tokens; caller-provided classes
are preserved. The supported CSS browser floor is Safari 16.4+, Chrome 111+, and
Firefox 128+. See the [CSS guide](docs/issue-80/css-isolation.md) for portal themes
and migration from version 1.

Version 2.1 makes selection and styling props optional and fixes the annotation
click callback's `direction` field. Existing controlled integrations remain
supported. See [usage](docs/usage.md) and [validation](docs/issue-80/validation.md).

## Used in

- [NVIDIA Build](https://build.nvidia.com/arc/evo2-40b)
- [Tatta Bio Gaia](https://gaia.tatta.bio/)
- [EvolutionaryScale Forge](https://forge.evolutionaryscale.ai/)
- [Nitro Bio Sequences](https://sequences.nitro.bio/)

## Development

Use pnpm 11.9.0 from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm format
pnpm test
pnpm build:ci
pnpm exec playwright install chromium
pnpm test:packed
```

Packed consumer checks cover React 18/19, plain CSS and Tailwind 3/4 integration,
selection and copying, validation recovery, and real self-hosted MAFFT under CSP.
`pnpm dev` starts Storybook. `pnpm benchmark` records production-browser workload
measurements; see [the benchmark guide](benchmarks/README.md) for reproduction.

[Report an issue](https://github.com/nitro-bio/sequence-viewers/issues) with the
package version, framework, browser, and a minimal reproducer.
