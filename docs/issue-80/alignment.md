# Browser alignment

`SequenceViewer` alignment is disabled by default. Enable it explicitly and
provide the state update callback that receives the completed alignment:

```tsx
<SequenceViewer
  sequences={sequences}
  setSequences={setSequences}
  enableAlignment
  alignmentConfig={{
    urlCDN: "https://assets.example.com/biowasm",
    debug: false,
  }}
  // ...the viewer's other props
/>
```

`enableAlignment` does not depend on whether `setSequences` exists. When it is
true but the callback is missing, the Align action remains disabled and names
the missing callback. Empty sequence collections and collections containing an
empty sequence have no alignment action. `debug` defaults to `false`.

## Asset loading and execution

The Aioli JavaScript dependency is split into a lazy browser chunk. Creating a
viewer, including an alignment-enabled viewer, does not initialize Aioli or
fetch tools. The first Align action creates one worker for that viewer and
configuration. The MAFFT programs load only when their commands run. Later
retries reuse that client.

By default, Aioli loads executable assets from
`https://biowasm.com/cdn/v3`. The exact pinned tools are:

- Coreutils `cat` 8.32, used as Aioli's base filesystem module.
- MAFFT `tbfast` 7.520.
- MAFFT `dvtditr` 7.520.

Installing `@biowasm/aioli` from npm supplies the worker controller, not these
tool assets. With the default configuration, the browser still downloads the
JavaScript and WebAssembly executables from Biowasm. Sequence data is written
to the browser worker's virtual filesystem and alignment runs locally; it is not sent to an
alignment service.

## Self-hosting

Copy all six executable files into this exact tree under one public web root:

```text
biowasm/
├── coreutils/8.32/
│   ├── cat.js
│   └── cat.wasm
└── mafft/7.520/
    ├── dvtditr.js
    ├── dvtditr.wasm
    ├── tbfast.js
    └── tbfast.wasm
```

Then set `alignmentConfig.urlCDN` to the URL of `biowasm` without a trailing
tool or version segment. Aioli appends `/{tool}/{version}/{program}`. An
absolute same-origin URL avoids ambiguity inside the blob worker:

```tsx
alignmentConfig={{
  urlCDN: new URL("/biowasm", window.location.origin).href.replace(/\/$/, ""),
}}
```

Serve `.js` as JavaScript and `.wasm` as `application/wasm`. Cross-origin asset
hosting must allow the application origin with CORS. The public Biowasm assets
were verified to return `Access-Control-Allow-Origin: *`, JavaScript content
type for tool loaders, and `application/wasm` for WebAssembly files.

Aioli 3.2.1 creates its worker from a blob, calls `importScripts()` for each
tool's JavaScript, and resolves the corresponding WebAssembly file from the
same tool/version directory. Because a blob worker inherits its creator's CSP,
a restrictive policy needs to allow:

- `blob:` in `worker-src`.
- the executable asset origin in `script-src` and `connect-src`.
- WebAssembly compilation, commonly expressed as `'wasm-unsafe-eval'` in
  `script-src`.

For same-origin self-hosting, the asset-origin entries are normally `'self'`.
Test the policy in every supported browser because CSP fallback behavior for
workers varies when `worker-src` is omitted. These directives were derived from
the installed Aioli worker implementation and browser CSP rules; the packed
browser smoke test blocks the public CDN and proves same-origin asset loading,
but does not impose a production CSP header.

## Completion and failures

Each input record receives an internal identifier before MAFFT runs. Completed
output is accepted only when every identifier appears exactly once, every
aligned record is nonempty and the same length, and each record's ungapped
residues still match its corresponding input while ignoring case and existing
gap placement. Accepted output retains MAFFT's gaps and is normalized to upper
case in the callback.

Only one operation can run per viewer at a time. A committed change to input,
configuration, or enablement invalidates the operation, even if the values later
change back before it finishes. Invalidated and unmounted operations do not call
`setSequences`. Changing the callback alone does not invalidate an operation;
the latest committed callback receives the result once. Consumer callback
exceptions are not presented as alignment failures.

Failures render an accessible alert and turn the action into Retry alignment.
The hook removes files created by each operation through Aioli's documented
virtual filesystem API. Aioli 3.2.1 exposes no public worker termination method,
so the client is retained and reused for the mounted viewer rather than calling
an unsupported cleanup method. Unmounting blocks state and callback updates and
an in-flight operation still removes its files, but this Aioli version cannot be
asked to terminate an idle worker explicitly.
