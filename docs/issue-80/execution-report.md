# Issue 80 implementation report

Implemented against GitHub issue [#80](https://github.com/nitro-bio/sequence-viewers/issues/80), fetched with its current repository and comments on September 11, 2026. The issue was open with no comments. The original checkout remains on `main`; implementation and review use separate worktrees. No remote PR, push, merge, release, tag, or npm publication was performed. Package version remains 1.4.1 until an authorized Changesets versioning step.

## Changes delivered

| Workstream        | Result                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering         | Optional annotations share one stable empty value. Stacking uses a safe maximum-length scalar; memo dependencies follow callbacks and styling. Empty/shrinking data cannot leave active copy/download/alignment operations or stale selection indices. Native listeners clean up their own handlers; rendering does not sort shared annotation arrays. Hooks lint is enabled.           |
| CSS and packaging | Distributed CSS omits global Preflight, prefixes utilities and theme references with `nsv`, and supplies scoped root/portal defaults. Caller class strings remain intact. The new `styles.css` export and both old aliases resolve to the same CSS; bundlers retain CSS side effects. Tailwind v4 is build tooling only, with no consumer Tailwind dependency.                          |
| Alignment         | Explicit opt-in, forwarded CDN/debug settings, lazy initialization, one result callback in the operation completion path, stale-operation guards, record association checks, accessible failures and retry, and cleanup through supported Aioli filesystem operations. Real self-hosted MAFFT and restrictive CSP checks run against the packed package.                                |
| Validation        | All three viewer boundaries recover by default, exclude malformed annotations with stable local diagnostics, and show a placeholder for unsafe sequence input. Explicit strict mode throws `ViewerValidationError`. Legacy/new precedence is tested. Renderer alphabet behavior, public schemas, parsing-helper strict defaults, coordinates, and caller callback errors are preserved. |

Integration resolved overlaps in all three viewer components semantically: validation precedes length/stacking transformations; stacking uses validated annotations and the actual maximum scalar; alignment receives validated input; empty/unsafe roots retain scoped styles and diagnostics. Valid annotation arrays retain their original identity, and both normalizers use the same empty constant. The combined validation-setting regression asserts an observable recovery-to-strict transition instead of requiring unnecessary regeneration of already-valid annotated content.

## Models and execution

The available tools supported the requested configuration. The four implementation agents (`rendering`, `css_isolation`, `alignment`, `validation`) and the independent reviewer (`independent_review`) used **gpt-5.6-sol with xhigh reasoning**. Four total concurrency slots allowed three implementers beside the coordinator; the fourth started when a slot became available. The coordinator used its inherited host model; it did not claim a separate model override.

## Commits and worktrees

Common source baseline: `ddb06c008717d225019a15785eb56fb6f9dacaeb`.
Shared tooling foundation: `b4957080ccb163ed6217eb86e643365d284df7b1`.
Initial review candidate: `05bb8b32746f583d6f54c7726dcad76efaa27712`.
Combined code candidate after review fixes: `54c8cb41ff0fe7cf42fb4791ddbf4ad67e4cd754`.
Only documentation/report commits follow this reviewed code snapshot. The final delivery commit is recorded in the accompanying completion response and by `git rev-parse codex/80-integration`.

All implementation worktrees are exposed beneath `/Users/nishantjha/Desktop/sequence-viewers/.worktrees/`. The baseline checkout at `/Users/nishantjha/Desktop/sequence-viewers` stays on `main` at the baseline above.

| Branch                     | Worktree suffix | Source-stream tip                                  |
| -------------------------- | --------------- | -------------------------------------------------- |
| `codex/80-rendering`       | `rendering`     | `3304034d9af8aebfb5e224fe6d5037f8b2897896`         |
| `codex/80-css-isolation`   | `css-isolation` | `c4c1c2a59d179009e7ff1694dfa5855ddec8c068`         |
| `codex/80-alignment`       | `alignment`     | `359f87fa890a3a2553f1f89b5536581c456b6bc1`         |
| `codex/80-validation`      | `validation`    | `8ab4d1f975b8571dbec633c2852fd3ff37e21ab8`         |
| `codex/80-integration`     | `integration`   | Candidate above, followed by report/review commits |
| Detached, read-only review | `review`        | Reviewed candidate above                           |

## Verification

Tests used pnpm **11.9.0**, Node **22.23.1**, and Playwright **1.55.0 / Chromium 140.0.7339.16**. Browser consumers import the extracted `npm pack` tarball; there is no alias to library source. Public executable assets are pinned and hash-checked by the preparation script.

| Check                                                                                                  | Baseline                                          | Combined result                                             | Evidence                                           |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Unit tests                                                                                             | Passed, 6 tests                                   | Passed, 77 tests in 5 files                                 | `final-unit.log`                                   |
| TypeScript and full ESLint                                                                             | Passed with warnings                              | Passed; no Hooks errors                                     | `final-lint.log`                                   |
| Formatting                                                                                             | Passed                                            | Passed                                                      | `final-format.log`                                 |
| Production JS, declarations and Tailwind CSS build                                                     | Passed                                            | Passed                                                      | `final-build.log`                                  |
| Storybook production build                                                                             | Not run by coordinator on baseline                | Passed; size warnings                                       | `final-storybook.log`                              |
| Packed CSS matrix                                                                                      | Baseline negative control fails as expected       | Passed, 6 cases: plain/Tailwind 3/Tailwind 4, both orders   | `final-packed.log`, `css-baseline-proof.log`       |
| Packed CSS static audit                                                                                | Global Preflight and shared theme state present   | Passed, 1 check, plus final read-only source prefix audit   | `final-packed.log`                                 |
| Packed React peers                                                                                     | Not run on baseline                               | Passed, React 18.3.1 and React 19.1.1                       | `final-packed.log`                                 |
| Disabled alignment, failed initialization and real tool retry                                          | Source baseline regressions reproduced            | Passed, 3 real-browser checks                               | `final-packed.log`                                 |
| Real MAFFT using six self-hosted assets, public CDN blocked                                            | Not run on baseline                               | Passed, normal policy and restrictive CSP                   | `final-packed.log`                                 |
| Packed export aliases, emitted API, consumer typecheck (strict, skipLibCheck) and browser bundle audit | Artifact inspected separately                     | Passed during packed preparation                            | `final-packed.log`                                 |
| Frozen offline dependency install                                                                      | Baseline lock used                                | Passed                                                      | `final-frozen-install.log`                         |
| Changesets status                                                                                      | No Changesets setup                               | Passed: four changesets plan 2.0.0, no versioning performed | `changeset-status.json`                            |
| Repository-wide `pnpm peers check`                                                                     | Failed: existing Storybook addon version mismatch | Same pre-existing mismatch remains                          | `final-peers.log`                                  |
| Firefox/WebKit and every supported minimum browser version                                             | Not run                                           | Not run                                                     | Chromium results do not establish these            |
| Remote GitHub Actions execution                                                                        | Not run                                           | Not run                                                     | Workflow updated; equivalent local commands passed |
| Release, publishing, tags and remote PRs                                                               | Not run                                           | Not run, explicitly outside authorization                   | Local Changesets and PR drafts only                |

The 14 packed-browser tests comprise 6 CSS matrix cases, 1 CSS artifact audit, 2 React-major smokes, and 5 alignment cases. Screenshots `final-viewers.png` and `final-portal.png` were visually inspected after passing computed-style assertions.

Evidence files are preserved at `/Users/nishantjha/Desktop/sequence-viewers/.worktrees/evidence/`. The original temporary evidence path remains available as a compatibility symlink. Generated packages, assets, and browser build output are ignored under the integration worktree's `.packed-test/`; none are manually edited or committed.

### Regression proof and pre-existing findings

- Fresh baseline JS, CSS, and Aioli output exactly match npm 1.4.1 bytes. [Contracts](contracts.md) records the tarball and artifact hashes. Published output actually retained `process.env` and the generated-filename log despite the old removal setting; it already contained the Alignment failed UI. Claims were checked against source and both artifact forms separately.
- Rendering's six representative new tests fail on a disposable baseline tree: fresh empty-array restacking, length/validation/style updates, empty operations, listener identity, and shared-array mutation. See `rendering-baseline.json`.
- Alignment's six component regression tests fail on the unfixed baseline, and malformed-annotation recovery fails on the separate validation baseline proof (`alignment-baseline-component.log`, `validation-baseline.log`). The agents used disposable environments instead of resetting any working checkout.
- The exact host-style browser comparison fails with the actual npm 1.4.1 CSS substituted: heading styles, margins, and native button/input borders and padding change. The same comparison passes with the new packed CSS.
- The remaining `utils.ts` constant-condition warning and Storybook peer mismatch are pre-existing. The mismatch is between Storybook 9, transitive Storybook 8 components/theming, and the unused dark-mode addon expecting Storybook 7. React peer consumer smokes pass for both advertised major versions. Existing Storybook bundle-size and outdated Browserslist notices remain informational.
- A generated `group-hover` class references an absent `sequences-primary-muted` token at baseline and remains inert. It was recorded during the final CSS audit without expanding this issue's behavior.

## PR boundaries and migration

[Draft PR descriptions](pr-drafts.md) provide four focused changeset descriptions and migration notes. Four Changesets are present: one patch for rendering and three major changes for CSS, alignment, and validation, producing one eventual 2.0 release when versioned.

The implementation workstream branches share the tooling foundation and overlap in viewer files. They are **not four independently mergeable PRs**. `codex/80-integration` is the complete PR-ready combined branch with conflict resolutions, shared manifest/lockfile work, packed harness, CI, and documentation. The `codex/80-rendering` branch preserves existing validation defaults and is separately patch-compatible; it includes the shared development-tooling foundation. If an earlier rendering patch is merged, the 2.0 branch must be rebased/restacked over it, reconciling the already-reviewed overlapping viewer changes and the patch Changeset. Do not merge both source-stream and integrated copies as independent implementations.

Consumers should import `@nitro-bio/sequence-viewers/styles.css`, provide their own application reset, migrate viewer color overrides to the documented `--nsv-color-sequences-*` tokens, explicitly opt into alignment, and select strict validation where exceptions are desired. Plain CSS and Tailwind 3 applications do **not** need to upgrade to Tailwind 4. The shipped CSS uses the documented modern browser floor.

## Independent review and remaining limits

The independent reviewer signed off on `54c8cb41ff0fe7cf42fb4791ddbf4ad67e4cd754` with **no remaining substantive findings**. All initial and follow-up findings were addressed: stale post-drag selection replay; standalone tick/gutter CSS; caller-root containment and circular diagnostic geometry; packed migration guides and explicit diagnostic list styles; settled alignment state and invalid FASTA control characters; configuration and initialization worker allocation; stale lazy imports; and commit-to-passive-effect races.

The reviewer performed source review in the separate read-only worktree, inspected relevant artifacts/logs, and did not claim to run browser or build checks. The coordinator executed the full suite. Both drag tests fail on the earlier candidate (`drag-review-negative.log`), alignment lifecycle tests fail on their corresponding pre-fix candidates (`alignment-review-candidate-failures.log`, `alignment-init-review-candidate-failures.log`), and the deterministic layout-phase regression fails before commit-synchronous refs (`commit-phase-negative.log`). All pass on the final candidate.

Real browser recovery deliberately aborts the first MAFFT loader request, then successfully aligns after Retry while asserting **exactly one Worker**. The hook uses Aioli's actual `reinit("mafft")` operation. Constructor initialization failures retain the failed promise and require remount, while repeated attempts cannot allocate another worker; configuration changes after construction also require remount. Imports that become obsolete before construction are canceled before any worker is created.

The reviewer also identified a pre-existing unresolved `@Ariadne` import alias in emitted CircularViewer declarations. The packed consumer typecheck uses strict checking with `skipLibCheck`; it therefore checks consumer usage without claiming that all historical declaration internals pass a standalone full-library typecheck.

Aioli 3.2.1 has no public worker termination method. Completed operations clean up their virtual filesystem files and reuse the client while mounted; unmount prevents results or state updates, but this version cannot explicitly terminate an idle worker. No unsupported teardown API is invented. There are no remaining implementation blockers for issue 80. Cross-browser/CSP coverage beyond Chromium and the unrelated Storybook peer cleanup remain follow-up work, not a hidden passing result. To close those evidence gaps, run the packed suite with Firefox/WebKit on the supported versions and resolve the Storybook toolchain's pre-existing peer ranges in a separate change.
