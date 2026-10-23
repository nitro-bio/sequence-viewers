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

Starting a mouse selection chooses the sequence under the first character and
locks the drag to that sequence. Only its selected range is highlighted. Gaps
(`-`) can start a selection; empty padding cannot. Dragging to an earlier
character selects across the seam: from the starting character through the end
of the sequence, then from the beginning through the current character.

`AriadneSelection` accepts an optional zero-based `sequenceIdx`. For example,
`{ start: 1, end: 4, direction: "forward", sequenceIdx: 1 }` selects those columns
only in the second sequence. Mouse selections include this field. Omit it to
highlight the range in every sequence, including selections shared from another
viewer. An index that no longer exists displays no residue selection.

The copy button and keyboard copy use the same selection. With `sequenceIdx`,
they copy the selected range as plain text. Without it, they copy all nonempty
selected ranges as FASTA records headed `>Sequence_1`, `>Sequence_2`, and so on,
with lines wrapped at 60 characters. Original case and alignment gaps are
preserved; padding and empty ranges are omitted.

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
than end crosses the origin. Mouse drags keep `start` at the initial character,
update `end` to the current character, and emit `direction: "forward"`. Keep
complete strings and coordinate conventions consistent when linking the linear,
circular, and residue viewers.

## Position labels

`positionLabels?: readonly (string | null)[]` supplies display labels for aligned
columns. Null, empty, or missing entries are blank; extra entries are ignored.
The default `MinimalPositionLabel` component keeps labels horizontal. For dense
numbering, use `positionLabelRenderer={AdaptivePositionLabel}` or `"adaptive"`.
Both components and the `PositionLabelProps` and `PositionLabelRenderer` types
are exported from the package root.

You can also pass your own React component to `positionLabelRenderer`. Each
nonblank label receives `{ label, columnIndex, isSelected, isHovered }`.
See the [position-label guide](position-labels.md) for examples and layout behavior.

Labels affect display only. Selection, annotations, and hover coordinates still
refer to zero-based aligned columns. Keep labels synchronized with sequences
when applying alignment results. Omit both label props to keep the original
ruler.

## Annotations and styling

Annotations are optional. A click callback receives the annotation, including `{ start, end, direction }`.
A controlled viewer's annotation can use `onClick: setSelection` directly.
Version 2.1 fixes the misspelled `diection` field emitted in version 2.0.

`charClassName` is optional. Its `{ base, sequenceIdx }` argument lets you choose
residue classes from your application's CSS. Customize the public
`--nsv-color-sequences-*` tokens for theming. The default selection background
uses a translucent version of each residue's sequence color, including at gaps
and mismatches. Override it with `selectionClassName` or
`--nsv-color-sequences-selection`. See the [CSS guide](issue-80/css-isolation.md).

## Optional alignment

Viewing sequences does not require an alignment backend or runtime tool
download. Enable Align with `enableAlignment` and provide `setSequences` to
apply the result. MAFFT assets load lazily on the first action; sequence data
stays in the browser worker. Alignment changes column coordinates, so clear or
remap controlled selections, annotations, and position labels when applying the
result.

See [self-hosted alignment](alignment-self-hosting.md) for asset setup and the
[alignment reference](issue-80/alignment.md) for CSP, retries, and worker limits.

## Choosing a workload

See [workloads and accessibility](limits.md) before using long sequences, large
alignments, or keyboard-only workflows. There is no enforced sequence length
limit, and the residue viewer windows large DOM workloads. Successful validation
means the data has a safe shape, not that any size will render responsively.
Validation recovers locally by default; use `validationMode="strict"` for errors
handled by your application boundary.
