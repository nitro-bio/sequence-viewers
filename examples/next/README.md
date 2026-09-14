# Next.js App Router example

This example runs `SequenceViewer` in a client component on Next.js 16 and React 19. It demonstrates controlled selection, caller residue classes, and optional
browser alignment using same-origin assets.

From the repository root:

```sh
pnpm install
pnpm build:ci
pnpm --filter @nitro-bio/sequence-viewers-example-next-app-router prepare:alignment-assets
pnpm --filter @nitro-bio/sequence-viewers-example-next-app-router dev
```

To run the example as an independent consumer after copying it out of the
repository:

```sh
cp -R examples/next /tmp/sequence-viewer-next
cd /tmp/sequence-viewer-next
pnpm install
pnpm prepare:alignment-assets
pnpm dev
```

The standalone install downloads `@nitro-bio/sequence-viewers` from npm. The
library stylesheet belongs in the root App Router layout, while the viewer itself
belongs in a file with the `"use client"` directive.

`prepare:alignment-assets` downloads and verifies the exact tool files expected by
Aioli, then writes them to `public/biowasm`. The page derives an absolute URL from
`window.location.origin` after hydration and supplies it as
`alignmentConfig.urlCDN`.

The CI smoke copies this project to `.packed-test`, installs the freshly packed
npm tarball in isolation, builds it, serves the production application, and opens
it in Chromium. It also blocks the public CDN and completes a real alignment from
the pinned JavaScript and WebAssembly files served by Next.js.
