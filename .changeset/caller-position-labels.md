---
"@nitro-bio/sequence-viewers": minor
---

Add caller-supplied position labels and configurable label components to SequenceViewer.

- `positionLabels` maps labels to aligned columns, including insertion codes and reference coordinates. Null or missing entries leave blank ruler slots.
- Export `MinimalPositionLabel` (the default) and `AdaptivePositionLabel` (opt-in rotation for dense labels), and accept custom React components through `positionLabelRenderer`.
- Preserve numeric selection and annotation coordinates and the existing ruler when both new props are omitted.
- Include the position-label guide in the npm package.
