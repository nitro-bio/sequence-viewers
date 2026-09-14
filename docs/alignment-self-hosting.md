# Self-host browser alignment assets

Browser alignment uses MAFFT through Biowasm Aioli. The npm package contains the
viewer and worker controller; the browser still needs the executable JavaScript
and WebAssembly files for MAFFT 7.520 and Coreutils 8.32.

This repository includes a dependency-free downloader that pins and verifies all
six files by SHA-256. Point it at the public directory used by your framework:

```sh
# Next.js or Vite
pnpm exec nitro-sequence-assets public/biowasm
```

With npm, call the same executable from a package script such as
`"prepare:alignment-assets": "nitro-sequence-assets public/biowasm"`, then run
`npm run prepare:alignment-assets`. You can also invoke the installed file
directly with
`node node_modules/@nitro-bio/sequence-viewers/scripts/prepare-alignment-assets.mjs public/biowasm`.

When working from this repository, use the checked-in script directly:

```sh
node scripts/prepare-alignment-assets.mjs public/biowasm
```

Running the command again verifies and reuses valid files. Missing or stale files
are downloaded again. The resulting public tree is:

```text
public/biowasm/
├── coreutils/8.32/
│   ├── cat.js
│   └── cat.wasm
└── mafft/7.520/
    ├── dvtditr.js
    ├── dvtditr.wasm
    ├── tbfast.js
    └── tbfast.wasm
```

Import the package stylesheet once, keep the aligned sequences in state, and
pass an absolute URL for that directory to `alignmentConfig.urlCDN`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { SequenceViewer } from "@nitro-bio/sequence-viewers";
import "@nitro-bio/sequence-viewers/styles.css";

export function AlignedSequences() {
  const [sequences, setSequences] = useState(["ACGT", "AGT"]);
  const [urlCDN, setUrlCDN] = useState<string>();

  useEffect(() => {
    setUrlCDN(new URL("/biowasm", window.location.origin).href);
  }, []);

  return (
    <SequenceViewer
      sequences={sequences}
      setSequences={setSequences}
      enableAlignment={Boolean(urlCDN)}
      alignmentConfig={urlCDN ? { urlCDN } : undefined}
    />
  );
}
```

The delayed absolute URL keeps this component safe during Next.js server
rendering and supplies the blob worker with an unambiguous same-origin asset
root. For Vite-only clients, it is also safe to construct the URL directly from
`window.location.origin`.

Serve `.js` files with a JavaScript content type and `.wasm` files as
`application/wasm`. A restrictive Content Security Policy needs `blob:` in
`worker-src`, `'wasm-unsafe-eval'` in `script-src`, and the asset origin in both
`script-src` and `connect-src`. Cross-origin hosting also needs CORS permission
for the application origin.

The complete runnable implementation lives in
[`examples/next`](../examples/next). Its `prepare:alignment-assets` script copies
the verified assets into the correct public directory before development or
deployment.
