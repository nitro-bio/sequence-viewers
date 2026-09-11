# Issue 80 execution contracts

- Source baseline: `ddb06c008717d225019a15785eb56fb6f9dacaeb` (current origin/main on 2026-09-11). Issue 80 open, no comments.
- Original checkout: `/Users/nishantjha/Desktop/sequence-viewers`, left on main. All implementation lives in separate worktrees exposed at `.worktrees/` (physical root `/private/tmp/sequence-viewers-80-worktrees`).
- Four implementation streams use `gpt-5.6-sol`, `xhigh`; at most three concurrent implementers plus coordinator due to four total slots. Independent final reviewer uses the same requested configuration.
- Package manager: pnpm 11.9.0. Coordinator owns package.json, pnpm-lock.yaml, Vite/test configuration, release setup and CI. Dependencies are shared via integration node_modules; workers request additions.
- Library-owned Tailwind prefix: `nsv:` (Tailwind v4 prefix syntax), including variants such as `nsv:hover:*`. Library scope marker: `nsv-root`; portal scope marker: `nsv-portal`. Caller-provided strings must remain verbatim. CSS worker coordinates final sweep after integration.
- Alignment API: `enableAlignment?: boolean` default false; `alignmentConfig?: { urlCDN?: string; debug?: boolean }` debug default false. No callback: disabled alignment action with explanation. No alignment actions on empty data. Assets/initialization remain lazy. Completion applied once in operation completion, with stale-input and unmount guards.
- UI validation API: `validationMode?: "recover" | "strict"`, default recover. Explicit validationMode wins; otherwise deprecated `noValidate: true` maps to recover and `noValidate: false` maps to strict. Omitted legacy option maps to recover. Rendering-only branch keeps old validation defaults for patch compatibility. Parsing helpers retain strict throwing defaults. Renderer stays alphabet-agnostic.
- Stable empty annotations normalize both omitted and fresh empty arrays; no deep comparison or serialization. Preserve index and padding semantics.
- UI diagnostics use stable local accessible content, not render-time logs/callbacks. Invalid annotations are excluded; unsafe sequence input becomes a local placeholder. Never catch consumer callback errors as validation errors.
- Changesets: rendering patch; CSS, alignment and validation major, targeting one eventual 2.0 release. No publish, tags, push, remote PR, or merge into main.

## Baseline verification

`pnpm lint`, `pnpm test`, `pnpm format`, and `pnpm build:ci` all passed. Six tests in one file. Existing lint warning: utils.ts constant condition at line 425; React version configuration warning and Node deprecation notices also present. `pnpm peers check` fails on both baseline and shared-tooling trees: the unused Storybook dark-mode addon expects Storybook 7 components/theming, while these resolve to 8.4.7 and the application uses Storybook 9.0.18. This is a pre-existing tooling mismatch, separate from the package React peer contract. Fresh output and npm 1.4.1 CSS, main JS and Aioli chunk are byte-for-byte identical:

| Artifact    | SHA-256                                                          |
| ----------- | ---------------------------------------------------------------- |
| CSS         | eafea0d75297b9595b532b8134c72d7cb26ccec3c6602658a61b05babe0b3394 |
| Main JS     | c804eb6eb7bff98bfca6a54ab2e41fbd11bc1e1e361add8be953921331d52de0 |
| Aioli chunk | 59c9c594cd0a4e1e0ac8a282b22706d0fbc852d85c9999a50baf76a520952e1f |

Published tarball shasum: `956d14c33e8ece12b3f2c427379a4a3ff0f7025e`. Both published and fresh output retain process.env, Generated unique file name logging, and the existing Alignment failed state. Source imports complete Tailwind preflight, has the reported memo/listener/selection defects, applies alignment from metadata effects, and runs safeParse even with noValidate. Public alphabet schemas remain supported exports. Baseline logs and tarball are at `/private/tmp/sequence-viewers-80-evidence`.
