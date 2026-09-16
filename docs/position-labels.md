# Caller-supplied position labels

`SequenceViewer` accepts `positionLabels?: readonly (string | null)[]`.
Each entry labels its displayed, zero-based column. Supplied labels replace the
existing index ruler. The packaged `MinimalPositionLabel` renderer is the default,
including when labels are supplied. Omit both label props to preserve the original
zero-based index ruler exactly.

Import `@nitro-bio/sequence-viewers/styles.css` once in your application entry
point. Use the adaptive renderer for dense numbering:

```tsx
import {
  SequenceViewer,
  AdaptivePositionLabel,
} from "@nitro-bio/sequence-viewers";

<SequenceViewer
  sequences={["AC-GT", "ACTGT"]}
  positionLabels={["35", "35a", null, "36", "37"]}
  positionLabelRenderer={AdaptivePositionLabel}
/>;
```

Null, empty strings, and missing entries leave blank slots; extra entries are
ignored. An empty array reserves the ruler but displays no labels. Callers can
label gap columns and choose which sequence or coordinate system the shared
ruler represents.

## Packaged renderers

Both components and their prop types are exported from the package root:

```tsx
import {
  SequenceViewer,
  MinimalPositionLabel,
  AdaptivePositionLabel,
  type PositionLabelProps,
} from "@nitro-bio/sequence-viewers";

// Default: compact, horizontal | label ticks.
<SequenceViewer {...viewerProps} positionLabels={labels} />;

// Explicitly select either packaged component.
<SequenceViewer
  {...viewerProps}
  positionLabels={labels}
  positionLabelRenderer={MinimalPositionLabel}
/>;
<SequenceViewer
  {...viewerProps}
  positionLabels={labels}
  positionLabelRenderer={AdaptivePositionLabel}
/>;
```

The string shortcuts `positionLabelRenderer="minimal"` and
`positionLabelRenderer="adaptive"` select the same packaged components.
If a renderer is supplied without labels, it receives the default zero-based
column numbers at intervals of ten.

- **Minimal (default):** compact horizontal text and an underline, matching the
  original ruler's style. It never rotates or hides labels. Callers should use
  sparse labels; dense labels can overlap.
- **Adaptive (opt-in):** horizontal labels when they fit. If labels would overlap,
  the ruler rotates 90° and reserves space for its longest label. Large inputs
  use virtualization, with each mounted ruler row choosing its own layout.

Both follow columns onto every wrapped line and shift horizontal labels inward
at line edges. Minimal labels wider than a complete line can still overflow;
use adaptive labels or abbreviate the text in that case.
Resizing and font loading recalculate layout. Adaptive rulers add vertical space
when labels are dense or long.

## Custom component slot

Pass a React component as `positionLabelRenderer`. It is mounted separately for
each nonblank label, so hooks and local state work normally. Define it outside
the parent render to avoid remounting it on every update. With large inputs,
offscreen rows unmount during scrolling; keep persistent state outside the label
component and key it by column or by your own stable identifier.

```tsx
function MyPositionLabel({
  label,
  columnIndex,
  isSelected,
  isHovered,
}: PositionLabelProps) {
  return (
    <span
      title={`Aligned column ${columnIndex}`}
      style={{ color: isSelected || isHovered ? "teal" : "inherit" }}
    >
      {label}
    </span>
  );
}

<SequenceViewer
  {...viewerProps}
  positionLabels={labels}
  positionLabelRenderer={MyPositionLabel}
/>;
```

The slot receives `label: string`, `columnIndex: number`, `isSelected: boolean`,
and `isHovered: boolean`. Blank entries reserve a slot without mounting a label
component. Hover reflects the hovered residue or annotation column. Clicking a
custom label does not start a residue selection.

Custom components use adaptive geometry: the viewer owns the surrounding slot,
tick, positioning, and rotation, while the component owns the label content.
Rendered dimensions are measured, including later changes to the component's
size. Keep content compact enough to fit a residue column when rotated.

Selection, annotations, hover metadata, and callbacks continue using numeric
column indices. Callers must regenerate labels when alignment changes columns,
including results received through `setSequences`. This feature does not remap
coordinates automatically. The standalone `ReferenceTicks` API is unchanged.

For example, to number the first sequence's ungapped residues from one:

```tsx
const reference = "AC-GT";
let residueNumber = 0;
const labels = Array.from(reference, (base) =>
  base === "-" ? null : String(++residueNumber),
);
// labels: ["1", "2", null, "3", "4"]

<SequenceViewer
  sequences={[reference, "ACTGT"]}
  positionLabels={labels}
  positionLabelRenderer="adaptive"
/>;
```

The same shared ruler applies to every sequence, so choose a reference explicitly
when different rows have different gaps. Supplying labels does not change the
numbering shown by `ReferenceTicks` or the viewer's numeric hover metadata.
