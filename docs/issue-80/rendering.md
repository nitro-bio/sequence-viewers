# Rendering correctness and streaming updates

The three viewers now accept an omitted `annotations` prop. Omitted annotations
and empty annotation arrays normalize to one stable internal empty value, so a
component that passes a fresh `annotations={[]}` on each render does not repeat
annotation stacking while its other inputs are unchanged. Non-empty arrays keep
their normal reference semantics because annotations may contain callbacks.

Annotation stacking depends on the scalar maximum sequence length. The maximum is
calculated with a reduction initialized to zero, which gives `[]` and `[""]` an
intentional empty state. SequenceViewer renders its empty container without copy,
download, or alignment controls. Linear and circular selection rendering is
inactive while their sequence is empty.

Memoized output now follows validation, callback, and style props. Native
selection handlers retain the latest consumer callbacks while their effects use
stable function identities, preventing listener churn and callback-driven effect
loops. Document and window listeners remove the same functions they registered.

When sequence data shrinks, stale selections are clipped for display, stale copy
indices select the last available sequence, and absent target sequences yield an
empty copy result. Sequence lookup still uses each annotated base's `index`, and
space padding continues to be removed by the existing annotation conversion.
