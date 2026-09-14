# @nitro-bio/sequence-viewers

## 2.1.0

### Minor Changes

- `SequenceViewer` now works with only `sequences`. Selection defaults to internal state and residue styling has a default; existing controlled selection remains supported, including explicit `null`.
- Annotation click callbacks receive a public annotation with the correctly spelled `direction` field. Metadata actions now have accessible names and use the actual sequence base for custom styling.
- Residue rendering indexes bases once instead of repeatedly scanning each row. Published workload measurements document remaining DOM costs and interaction limitations.
- Added complete Next.js/React 19 and Vite/React 18 applications, built and tested against the packed npm artifact.
- Added a self-hosted alignment asset preparation command, documented CSP setup, and integration coverage.
- Reworked the README, usage guide, npm discovery metadata, and links to machine-readable documentation.

## 2.0.0

### Major Changes

- 6e9668c: Prepare sequence viewers 2.0 with isolated styles and safer viewer integration:

  - Remove global Tailwind Preflight, prefix library utilities and theme variables,
    and scope defaults to viewers and portals. Import `styles.css`, provide your
    application's reset, and migrate color overrides to `--nsv-color-sequences-*`.
    Both legacy CSS imports remain supported. See the [CSS migration guide](docs/issue-80/css-isolation.md).
  - Require `enableAlignment` and `setSequences` for browser alignment, support
    self-hosted assets through `alignmentConfig`, and reject stale or malformed
    results. Repeated runs and retries reset both MAFFT programs on one lazy worker.
    See the [alignment guide](docs/issue-80/alignment.md).
  - Recover from malformed annotations with local diagnostics by default. Use
    `validationMode="strict"` to throw; deprecated `noValidate` remains supported.
    See the [validation migration guide](docs/issue-80/validation.md).
  - Stabilize streaming updates, optional/empty annotations, callbacks, styles,
    selection listeners, and empty/shrinking sequence data.
