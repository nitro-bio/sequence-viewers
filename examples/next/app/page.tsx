"use client";

import { useEffect, useState } from "react";
import {
  SequenceViewer,
  type AriadneSelection,
} from "@nitro-bio/sequence-viewers";

const initialSequences = ["ACGTTGCAACGT", "ACGTAGCAACGT"];

export default function Home() {
  const [sequences, setSequences] = useState(initialSequences);
  const [selection, setSelection] = useState<AriadneSelection | null>(null);
  const [alignmentAssetUrl, setAlignmentAssetUrl] = useState<string>();
  const [alignmentCompletions, setAlignmentCompletions] = useState(0);

  useEffect(() => {
    setAlignmentAssetUrl(new URL("/biowasm", window.location.origin).href);
  }, []);

  return (
    <main>
      <p className="eyebrow">Next.js App Router + React 19</p>
      <h1>Inspect and align DNA sequences</h1>
      <p className="intro">
        Drag across residues to select them. Alignment runs in your browser
        against assets served from this application&apos;s public directory.
      </p>
      <section
        className="viewer-card"
        aria-label="DNA sequences"
        data-testid="viewer-example"
      >
        <SequenceViewer
          sequences={sequences}
          setSequences={(alignedSequences) => {
            setSequences(alignedSequences);
            setAlignmentCompletions((count) => count + 1);
          }}
          selection={selection}
          setSelection={setSelection}
          charClassName={({ base }) =>
            base.base === "G" || base.base === "C" ? "gc-residue" : ""
          }
          enableAlignment={Boolean(alignmentAssetUrl)}
          alignmentConfig={
            alignmentAssetUrl ? { urlCDN: alignmentAssetUrl } : undefined
          }
        />
      </section>
      <output
        className="selection"
        aria-live="polite"
        data-testid="selection-output"
      >
        {selection
          ? `Selected residues ${selection.start + 1}–${selection.end + 1}`
          : "Drag across the viewer to select residues."}
      </output>
      <output data-testid="sequence-output" hidden>
        {JSON.stringify(sequences)}
      </output>
      <output data-testid="alignment-completions" hidden>
        {alignmentCompletions}
      </output>
    </main>
  );
}
