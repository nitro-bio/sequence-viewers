# CSS isolation and theming

Version 2 ships a self-contained stylesheet that does not reset the host
document. Library utilities use Tailwind v4's `nsv:` prefix, theme variables use
the `--nsv-` namespace, and the package applies its small base-style contract
only within `.nsv-root` and `.nsv-portal` elements.

## Importing styles

Import the stylesheet once from the package's public stylesheet entry point:

```ts
import "@nitro-bio/sequence-viewers/styles.css";
```

The existing aliases remain available:

```ts
import "@nitro-bio/sequence-viewers/dist/nitro-sequence-viewers.css";
import "@nitro-bio/sequence-viewers/dist/nitro.css";
```

The package stylesheet does not include an application reset. Applications
that want Tailwind Preflight or another reset should load it as part of their
own application stylesheet. Storybook does this in its application-only CSS
entry point.

Consumers do not need to install Tailwind. The compiled stylesheet follows the
Tailwind v4 browser floor: Safari 16.4, Chrome 111, and Firefox 128 or newer.

## Existing class-name hooks

Caller-provided strings remain unchanged. This applies to annotation
`className` values and the public `containerClassName`, `charClassName`,
`selectionClassName`, `sequenceClassName`, `mismatchClassName`, and
`ReferenceTicks` `className` hooks. A consumer using Tailwind classes in these
hooks must include or safelist those strings in the consumer's own Tailwind
build, just as for any other dynamically constructed class.

`getClassNameFromFeatureType` generates library defaults rather than consuming
a caller string. Its returned utilities now use the `nsv:` prefix. Code that
parses or replaces those generated strings must account for that intentional
version-2 change.

## Theme variables

The component color tokens are:

- `--nsv-color-sequences-primary`
- `--nsv-color-sequences-secondary`
- `--nsv-color-sequences-selection`
- `--nsv-color-sequences-foreground`
- `--nsv-color-sequences-background`
- `--nsv-color-sequences-mismatch`
- `--nsv-color-sequences-gap`

Override them on a viewer root. Radix Select renders outside that root, so put
portal-specific foreground and background overrides on `.nsv-portal` as well:

```css
.my-sequence-viewer {
  --nsv-color-sequences-primary: #047857;
  --nsv-color-sequences-selection: #059669;
  --nsv-color-sequences-foreground: #27272a;
  --nsv-color-sequences-background: #fafafa;
}

.nsv-portal {
  --nsv-color-sequences-foreground: #27272a;
  --nsv-color-sequences-background: #fafafa;
}
```

Pass `my-sequence-viewer` through the viewer's `containerClassName` prop.

## Regression proof

The 1.4.1 npm tarball and a clean build from baseline
`ddb06c008717d225019a15785eb56fb6f9dacaeb` emitted identical CSS
(`eafea0d75297b9595b532b8134c72d7cb26ccec3c6602658a61b05babe0b3394`).
That stylesheet included Tailwind Preflight selectors for host headings, lists,
buttons, inputs, and all elements.

The packed-package browser suite loads the version-2 stylesheet before and
after a plain host stylesheet, Tailwind 3, and Tailwind 4. It compares computed
host element styles and host theme variables before and after loading, checks
all three viewers, verifies caller class hooks, and opens the portal-rendered
sequence menu to check its layout, border, typography, and colors. The suite
uses the tarball produced by `npm pack`; source imports and jsdom results are not
used as evidence for CSS isolation.

The generated package CSS is also audited for unprefixed Tailwind utilities,
Preflight selectors, global `--tw-*` compatibility state, and unprefixed theme
variables. Utilities that would make Tailwind v4 emit global compatibility
properties use direct prefixed declarations instead. The remaining global
at-rule only declares cascade-layer order and has no style declarations.

## Limits

The package does not use Shadow DOM. Host selectors with higher specificity or
`!important` can intentionally override viewer styles. Portal content is not a
descendant of the viewer root, so a theme scoped only to a caller container
cannot reach it; mirror the relevant tokens on `.nsv-portal`.
