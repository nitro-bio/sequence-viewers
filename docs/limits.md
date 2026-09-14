# Workloads and accessibility

`SequenceViewer` renders a residue grid in the browser. It is intended for
interactive inspection of sequences and alignments that are small enough to
render as ordinary React DOM. It is not a virtualized genome browser and does
not enforce a size limit for you.

## How the workload grows

Let `L` be the longest sequence and `R` the number of sequences. The viewer
creates `L × R` residue cells, including placeholder cells for shorter rows.
Each cell contains both a residue and a coordinate-label element. It also
creates one annotation gutter per column, with a slot for every annotation
stack. Dense or overlapping annotations add work across the full displayed
length.

Selection changes rerender the displayed grid. During a pointer drag, entering
another residue updates the selection, so long or many-row views can make both
mounting and dragging expensive. Validation only checks whether input can be
rendered safely; successful validation is not a claim that the workload will be
responsive.

The viewer indexes supplied annotated bases once per render and looks them up by
coordinate. This avoids scanning a row for every cell, but it does not reduce
the number of rendered elements. `SeqContent` continues to use the first base
when an exported, manually constructed row contains duplicate indices.

## Measured workloads

Measured 2026-09-14 with version 2.1.0, React 18.3.1, headless Chromium 140.0.7339.16, Apple M4, 16 GiB RAM, darwin 25.6.0. Viewport: 1100x900; no CPU throttling. Values below are medians of three fresh-browser runs, rounded to milliseconds.

| Rows × bases | Displayed cells | Mount (ms) | Selection update (ms) | DOM elements |
| ------------ | --------------: | ---------: | --------------------: | -----------: |
| 1 × 1,000    |           1,000 |         36 |                    26 |        6,028 |
| 1 × 10,000   |          10,000 |        234 |                    73 |       60,028 |
| 10 × 1,000   |          10,000 |        162 |                    35 |       33,028 |
| 100 × 1,000  |         100,000 |      1,206 |                   319 |      303,028 |
| 1 × 100,000  |         100,000 |      2,118 |                   557 |      600,028 |

All cases completed and selected one cell per row. These fixtures have no annotations. Mount excludes network/module loading; selection uses a synthetic first-cell mouse event and waits for rendering. Alignment execution, dragging, scrolling, and assistive technology were not measured. [Raw trials and environment](https://github.com/nitro-bio/sequence-viewers/blob/v2.1.0/benchmarks/results.json).

The reproducible Chromium runner and its measurement method are documented in
[the benchmark guide](https://github.com/nitro-bio/sequence-viewers/blob/v2.1.0/benchmarks/README.md). The measurements describe one
machine and browser configuration. They are not a supported maximum, a CI
performance budget, or a latency guarantee for other devices.

## Operating guidance

- Test the real maximum sequence length, row count, annotation density, and
  target devices before shipping. Total displayed cells (`L × R`) is more useful
  than either dimension alone when comparing alignments.
- Treat a single 100 kb residue row as a stress case. Its structure requires
  100,000 residue cells and several DOM elements per cell. For routine use,
  display a smaller coordinate window and translate selection and annotation
  coordinates in the host application.
- Window or paginate large alignments before passing them to `SequenceViewer`.
  Rendering fewer rows helps, but shorter displayed ranges usually matter just
  as much because the longest row determines every row's column count.
- Use `LinearViewer` or `CircularViewer` for an overview, then open a bounded
  region in `SequenceViewer` for residue-level inspection. Test those viewers
  separately with representative inputs; the SequenceViewer benchmark does not
  measure their SVG rendering.
- Browser alignment has separate download, worker, and lifecycle constraints.
  See the [alignment reference](issue-80/alignment.md) before enabling it for
  large inputs.

There is deliberately no hard cutoff in the package because acceptable latency
depends on the browser, device, row styling, annotations, and host application.
Apply a product-specific limit or window before rendering rather than relying on
the browser to recover from an oversized DOM.

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
