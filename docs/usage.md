# Using Sequence Viewer

`@nitro-bio/sequence-viewers` displays DNA, RNA, protein, and pre-aligned strings
in React. Use `SequenceViewer` for residues, `LinearViewer` for a linear overview,
and `CircularViewer` for circular maps. These components display strings; they
do not infer biological meaning or validate an alphabet unless you explicitly
use the exported parsing/schema helpers.

## Minimal viewer

Install the package and import its compiled CSS once. React and React DOM 18.2+
or 19.x are peers. Tailwind is not required.

```tsx
"use client";

import { SequenceViewer } from "@nitro-bio/sequence-viewers";
import "@nitro-bio/sequence-viewers/styles.css";

export default function SequenceExample() {
  return <SequenceViewer sequences={["ATGACCTG", "ATGTCCTG"]} />;
}
```

For Next.js App Router, put `"use client"` on the component importing the viewer.
CSS can live in the root layout. Complete applications are in
[Next.js](https://github.com/nitro-bio/sequence-viewers/blob/v2.1.0/examples/next/README.md) and [Vite](https://github.com/nitro-bio/sequence-viewers/blob/v2.1.0/examples/vite/README.md).

## Selection ownership

Omit `selection` to let the viewer manage selection internally. An optional
`setSelection` callback observes changes. Supply `selection` and `setSelection`
to control it from your application. Explicit `selection={null}` means a
controlled empty selection; it does not enable internal state.

```tsx
"use client";

import { useState } from "react";
import {
  SequenceViewer,
  type AriadneSelection,
} from "@nitro-bio/sequence-viewers";
import "@nitro-bio/sequence-viewers/styles.css";

export default function ControlledSequence() {
  const [selection, setSelection] = useState<AriadneSelection | null>(null);
  return (
    <>
      <button onClick={() => setSelection(null)}>Clear selection</button>
      <SequenceViewer
        sequences={["ATGACCTG", "ATGTCCTG"]}
        selection={selection}
        setSelection={setSelection}
        highlightMisalignments
      />
    </>
  );
}
```

Coordinates are zero-based and both endpoints are included. A start greater
than end crosses the origin. Keep complete strings and coordinate conventions
consistent when linking the linear, circular, and residue viewers.

## Annotations and styling

Annotations are optional. A click callback receives the annotation, including `{ start, end, direction }`.
A controlled viewer's annotation can use `onClick: setSelection` directly.
Version 2.1 fixes the misspelled `diection` field emitted in version 2.0.

`charClassName` is optional. Its `{ base, sequenceIdx }` argument lets you choose
residue classes from your application's CSS. Customize the public
`--nsv-color-sequences-*` tokens for theming, including `.nsv-portal` for the
sequence dropdown. See the [CSS guide](issue-80/css-isolation.md).

## Optional alignment

Viewing sequences does not require an alignment backend or runtime tool
download. Enable Align with `enableAlignment` and provide `setSequences` to
apply the result. MAFFT assets load lazily on the first action; sequence data
stays in the browser worker. Alignment changes column coordinates, so clear or
remap controlled selections and annotations when applying the result.

See [self-hosted alignment](alignment-self-hosting.md) for asset setup and the
[alignment reference](issue-80/alignment.md) for CSP, retries, and worker limits.

## Choosing a workload

See [workloads and accessibility](limits.md) before using long sequences, large
alignments, or keyboard-only workflows. There is no enforced sequence length
limit, and the residue viewer windows large DOM workloads. Successful validation
means the data has a safe shape, not that any size will render responsively.
Validation recovers locally by default; use `validationMode="strict"` for errors
handled by your application boundary.
