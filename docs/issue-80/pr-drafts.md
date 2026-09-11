# Draft pull requests and migration notes

These are local drafts. No remote branches, pull requests, tags, or packages were created.

## Rendering correctness (patch)

**Title:** Fix streaming annotation memoization and empty-sequence interactions

SequenceViewer reprocessed every base when a streaming parent supplied a fresh empty annotations array, and stale memo dependencies ignored changes to sequence lengths, callbacks, and styling. Normalize empty annotations, complete memo dependencies, and handle empty/shrinking inputs without stale copy or selection operations. Clean up document mouse listeners and enable React Hooks lint rules across the source.

Keep the existing validation defaults in this branch so these fixes can be released separately as a patch. Include the deterministic regression tests and the shared Hooks lint dependency/configuration when extracting this patch.

## CSS isolation and package entrypoints (major)

**Title:** Scope viewer CSS and add a stable stylesheet import

The distributed stylesheet reset the host page and exported generic Tailwind utilities and theme variables. Scope the base styles needed by the viewers and portal menus, prefix library utilities/theme state, and keep Storybook's application reset outside the published stylesheet. Add `@nitro-bio/sequence-viewers/styles.css`, preserve both legacy CSS aliases, and retain CSS as a bundler side effect.

Consumers must provide their own application reset. Caller class strings remain unchanged; applications must compile or define the utilities they supply. See the CSS migration documentation for supported theme hooks and intentional changes. Validate a packed package in plain CSS, Tailwind v3, and Tailwind v4 consumers in both stylesheet orders.

## Explicit alignment (major)

**Title:** Make alignment opt-in and guard asynchronous completion

Passing an editing callback implicitly enabled alignment and executable asset downloads. Require `enableAlignment`, forward `alignmentConfig`, and initialize the toolchain only when the action runs. Apply successful output once from operation completion, preserve record association, and reject obsolete results when inputs change. Surface accessible errors and allow retry.

Consumers that use alignment must now pass `enableAlignment` and a sequence update callback. The default CDN serves pinned tool versions; npm installation does not remove runtime tool-asset downloads. Applications can self-host the documented assets and configure their origin. Validation includes mocked lifecycle tests and a distinct real self-hosted browser smoke test.

## Recoverable structural validation (major)

**Title:** Recover from malformed viewer data with explicit strict validation

Malformed annotations previously threw during rendering or escaped validation as unsafe data. Default UI validation to recovery: exclude invalid annotations with a stable local diagnostic and render a local placeholder for unsafe sequence inputs. Add `validationMode="strict"` for throwing behavior while retaining alphabet-agnostic sequence rendering and the public alphabet schema exports.

`validationMode` takes precedence over deprecated `noValidate`. Without the new option, `noValidate: true` maps to recovery, explicit `false` maps to strict, and omission uses recovery. Parsing helpers keep their own documented throwing defaults. No residue replacement, case conversion, or coordinate shifting is part of validation.

## Release plan

The CSS, alignment, and validation changes target one future 2.0 release. The rendering changes remain eligible for an earlier patch. The integration verification harness checks the complete API and therefore depends on all streams; it should be included with the last stacked PR. Final branch dependencies, verification results, and commit identifiers are recorded in the execution report after integration and review.
