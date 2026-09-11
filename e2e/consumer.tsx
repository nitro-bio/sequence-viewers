import { useState, version } from "react";
import { createRoot } from "react-dom/client";
import {
  CircularViewer,
  LinearViewer,
  LinearAnnotationGutter,
  ReferenceTicks,
  getAnnotatedSequence,
  SequenceViewer,
  type Annotation,
  type AriadneSelection,
} from "@nitro-bio/sequence-viewers";

const params = new URLSearchParams(location.search);
const framework = params.get("framework") || "plain";
const alignment = params.get("alignment") || "disabled";
const hostLink = document.createElement("link");
hostLink.rel = "stylesheet";
hostLink.href = `/host-${framework}.css`;
document.head.append(hostLink);

Object.assign(window, {
  reactVersion: version,
  alignmentUpdates: [] as string[][],
  loadLibraryStyles: (order: "before" | "after") =>
    new Promise<void>((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/library.css";
      link.onload = () => resolve();
      link.onerror = reject;
      if (order === "before") hostLink.before(link);
      else hostLink.after(link);
    }),
});

const annotations: Annotation[] = [
  {
    start: 1,
    end: 6,
    direction: "forward",
    type: "CDS",
    text: "Example feature",
    className: "caller-annotation",
  },
];

export function App() {
  const [sequences, updateSequences] = useState([
    "ACGTACGTACGT",
    alignment === "self-hosted" ? "ACGTTCGTACG" : "ACGTTCGTACGT",
  ]);
  const [selection, setSelection] = useState<AriadneSelection | null>({
    start: 1,
    end: 3,
    direction: "forward",
  });
  const setSequences = (next: string[]) => {
    (
      window as unknown as { alignmentUpdates: string[][] }
    ).alignmentUpdates.push(next);
    updateSequences(next);
  };
  const alignmentProps = {
    enableAlignment: alignment !== "disabled",
    alignmentConfig: {
      urlCDN: new URL(
        alignment === "failure" ? "/missing-assets" : "/assets",
        location.origin,
      ).href,
      debug: false,
    },
  };
  return (
    <main>
      <section id="host">
        <h1 data-testid="host-heading">Host heading</h1>
        <ul data-testid="host-list">
          <li>Host list item</li>
        </ul>
        <button data-testid="host-button">Host button</button>
        <input data-testid="host-input" defaultValue="Host input" />
        <div data-testid="host-theme">Host theme values</div>
        <div
          data-testid="host-utility"
          className="flex rounded-md border text-xs"
        >
          Host utilities
        </div>
      </section>
      <section data-testid="sequence-viewer">
        <SequenceViewer
          sequences={sequences}
          setSequences={setSequences}
          annotations={annotations}
          selection={selection}
          setSelection={setSelection}
          containerClassName="caller-container"
          charClassName={() => "caller-char"}
          selectionClassName="caller-selection"
          {...alignmentProps}
        />
      </section>
      <section data-testid="linear-viewer">
        <LinearViewer
          sequences={sequences}
          annotations={annotations}
          selection={selection}
          setSelection={setSelection}
          containerClassName="caller-linear"
        />
      </section>
      <section data-testid="circular-viewer">
        <CircularViewer
          sequence={sequences[0]}
          annotations={annotations}
          selection={selection}
          setSelection={setSelection}
          containerClassName="caller-circular"
        />
      </section>
      <section data-testid="standalone-ticks">
        <ReferenceTicks
          sequence={getAnnotatedSequence({
            sequence: sequences[0],
            stackedAnnotations: [],
          })}
        />
      </section>
      <section data-testid="standalone-gutter">
        <LinearAnnotationGutter
          sequence={getAnnotatedSequence({
            sequence: sequences[0],
            stackedAnnotations: [],
          })}
          stackedAnnotations={annotations.map((annotation) => ({
            ...annotation,
            stack: 0,
          }))}
        />
      </section>
      <output data-testid="sequence-output">{JSON.stringify(sequences)}</output>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
