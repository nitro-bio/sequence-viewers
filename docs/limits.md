# Workloads and accessibility

`SequenceViewer` preserves the ordinary wrapped DOM for workloads of 5,000
residue cells or fewer. Above 5,000 cells (`longest sequence × sequence count`),
it measures the host's monospace glyph and available width, divides coordinates
into wrapped coordinate blocks, and flattens each block into physical sequence
and annotation lines. A single TanStack Virtual range mounts only the physical
lines intersecting the viewport plus three lines of overscan. This keeps both
long sequences and alignments with many sequence rows bounded without nested
same-axis virtualizers.

Windowing works with page scrolling and nested scrolling containers. A resize
recomputes wrapping while anchoring the first visible logical coordinate.
Selection remains expressed in full-sequence coordinates, so a selection may
cross unmounted regions and appears as those regions enter the viewport. Copy,
download, mismatch highlighting, variable-length row padding, and annotation
callbacks continue to use the complete input. Server rendering emits a bounded
initial window and hydrates into measured browser geometry.

Virtual wrapping assumes every residue keeps the same monospace width and line
height as the viewer's measurement probe. `charClassName` may change paint
styles, but changing font size, family, width, line height, margins, or
transforms can make virtual row geometry inaccurate. Workloads at or below the
threshold still use ordinary flex wrapping.

Windowing bounds DOM and layout work; it does not bound input memory. Validation
and annotation construction remain proportional to the total residue count, and
the viewer retains annotated backing data for every residue so copy and download
do not depend on what is mounted. Dense overlapping annotations also retain one
annotation reference per covered residue. Use an overview viewer or paginate
inputs if backing memory, transfer size, or preprocessing is the limiting cost.

`SeqContent` continues to use the first base when an exported, manually
constructed row contains duplicate indices. A selection whose start is greater
than its end keeps its existing circular seam semantics.

## Measured workloads

The published 2.1.0 baseline and a 2.2.0 development build (`166da64`) were
both measured on the same Apple M4 machine with 16 GiB RAM, React 18.3.1,
headless Chromium 140.0.7339.16, a 1100×900 viewport, and no CPU throttling.
Values are medians of three fresh-browser runs, rounded to milliseconds.

| Rows × bases |   Cells | 2.1.0 mount | Candidate mount | 2.1.0 selection | Candidate selection | Candidate DOM |
| ------------ | ------: | ----------: | --------------: | --------------: | ------------------: | ------------: |
| 1 × 1,000    |   1,000 |       36 ms |           40 ms |           26 ms |               28 ms |         8,028 |
| 1 × 10,000   |  10,000 |      234 ms |           68 ms |           73 ms |               25 ms |         7,800 |
| 10 × 1,000   |  10,000 |      162 ms |           70 ms |           35 ms |               30 ms |         9,002 |
| 100 × 1,000  | 100,000 |    1,206 ms |           82 ms |          319 ms |               35 ms |         9,372 |
| 1 × 100,000  | 100,000 |    2,118 ms |           75 ms |          557 ms |               26 ms |         7,800 |

The candidate measurements predate the final viewport fixes and removal of two
small-grid DOM wrappers per coordinate. The fixtures contain no annotations.
Candidate selection counts only mounted
cells because offscreen selected cells intentionally have no DOM node. Mount
excludes network/module loading; selection dispatches a synthetic first-cell
mouse event and waits for rendering. These measurements are descriptive, not a
supported maximum or latency guarantee. See the [benchmark guide](../benchmarks/README.md)
and checked-in raw reports for the exact environment and source state. The
earlier hand-written virtualization candidate is retained separately so its
measurements are not attributed to this implementation.

## Operating guidance

- Test the real maximum length, sequence count, annotation density, container
  sizing, and target devices. DOM work is viewport-bounded after the threshold,
  while backing memory still follows total residues and annotation coverage.
- Use `LinearViewer` or `CircularViewer` for an overview when users do not need
  individual residues. Their SVG workloads are separate from this benchmark.
- Browser alignment has separate download, worker, and lifecycle constraints.
  See the [alignment reference](issue-80/alignment.md) before enabling it for
  large inputs.

## Interaction and accessibility

Residue selection is pointer-driven. Residues are non-selectable `div` elements
with mouse handlers; they are not focusable controls and do not expose a
built-in keyboard selection model. Annotation segments are also clickable and
hoverable `div` elements without keyboard activation. Hovered coordinates and
annotation metadata therefore have the same pointer-only limitation.

The metadata bar exposes the sequence picker as a labeled combobox and uses
named buttons for copy, download, and alignment actions. The packed consumer
suite exercises these controls in Chromium with pointer input. It does not
currently prove end-to-end keyboard navigation or screen-reader behavior.

For a keyboard-accessible workflow, keep selection controlled and provide host
controls that match the needs of your application. For example:

```tsx
import { useState } from "react";
import {
  SequenceViewer,
  type AriadneSelection,
} from "@nitro-bio/sequence-viewers";

const sequence = "ATGACCTG";

export function AccessibleSelectionExample() {
  const [selection, setSelection] = useState<AriadneSelection | null>(null);

  return (
    <section aria-label="Sequence inspection">
      <button
        type="button"
        onClick={() =>
          setSelection({
            start: 0,
            end: sequence.length - 1,
            direction: "forward",
          })
        }
      >
        Select all residues
      </button>
      <button type="button" onClick={() => setSelection(null)}>
        Clear residue selection
      </button>
      <output aria-live="polite">
        {selection
          ? `Selected residues ${selection.start} through ${selection.end}`
          : "No residues selected"}
      </output>
      <SequenceViewer
        sequences={[sequence]}
        selection={selection}
        setSelection={setSelection}
      />
    </section>
  );
}
```

Applications that must expose the sequence itself to assistive technology
should provide a separate labeled text or table representation appropriate to
their users. Do not rely on residue color, hover metadata, or the visual grid as
the only description of sequence differences.

## Browser scope

The compiled stylesheet follows the Tailwind 4 browser floor: Safari 16.4+,
Chrome 111+, and Firefox 128+. That floor describes CSS feature compatibility.
Current packed interaction and workload automation runs in Chromium, so test
critical workflows in every browser and assistive-technology combination your
application supports.
