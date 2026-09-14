# Vite + React example

This example renders `SequenceViewer` with its complete minimal API on React 18.

From the repository root:

```sh
pnpm install
pnpm build:ci
pnpm --filter @nitro-bio/sequence-viewers-example-vite-react dev
```

To run the example as an independent consumer after copying it out of the
repository:

```sh
cp -R examples/vite /tmp/sequence-viewer-vite
cd /tmp/sequence-viewer-vite
pnpm install
pnpm dev
```

The standalone install downloads `@nitro-bio/sequence-viewers` from npm. The
package stylesheet is imported once in `src/main.tsx`. `src/App.tsx` needs no
selection state or residue-style callback because both have built-in defaults.

The CI smoke copies this project to `.packed-test`, installs the freshly packed
npm tarball in isolation, builds it, and opens the production preview in Chromium.
