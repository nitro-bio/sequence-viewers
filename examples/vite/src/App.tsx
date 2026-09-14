import { SequenceViewer } from "@nitro-bio/sequence-viewers";

const sequences = [
  "MVLSPADKTNVKAAWGKVGAHAGEYGAE",
  "MVHLTPEEKSAVTALWGKVNVDEVGGEA",
];

export function App() {
  return (
    <main>
      <p className="eyebrow">Vite + React 18</p>
      <h1>Protein sequence comparison</h1>
      <p className="intro">
        The viewer below uses the complete minimal API. Selection state and
        residue colors are managed by the component.
      </p>
      <section
        className="viewer-card"
        aria-label="Protein sequences"
        data-testid="viewer-example"
      >
        <SequenceViewer sequences={sequences} />
      </section>
    </main>
  );
}
