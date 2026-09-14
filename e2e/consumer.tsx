import { Component, useState, version, type ReactNode } from "react";
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

const framework =
  new URLSearchParams(location.search).get("framework") || "plain";
const hostLink = document.createElement("link");
hostLink.rel = "stylesheet";
hostLink.href = `/host-${framework}.css`;
document.head.append(hostLink);
document.documentElement.dataset.react = version;

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">Viewer error boundary</p>
    ) : (
      this.props.children
    );
  }
}

const feature: Annotation = {
  start: 1,
  end: 6,
  direction: "forward",
  type: "CDS",
  text: "Example feature",
  className: "caller-annotation",
};

export function App() {
  const virtualMode = new URLSearchParams(location.search).get("virtual");
  const [sequences, updateSequences] = useState([
    "ACGTACGTACGT",
    "ACGTTCGTACG",
  ]);
  const [draft, setDraft] = useState(JSON.stringify(sequences));
  const [selection, setSelection] = useState<AriadneSelection | null>({
    start: 1,
    end: 3,
    direction: "forward",
  });
  const [enableAlignment, setEnableAlignment] = useState(false);
  const [invalidAnnotations, setInvalidAnnotations] = useState(false);
  const [strict, setStrict] = useState(false);
  const [alignmentUpdates, setAlignmentUpdates] = useState(0);
  const annotations = invalidAnnotations
    ? [feature, { ...feature, start: Number.NaN, text: "Invalid feature" }]
    : [feature];
  const shared = {
    annotations,
    selection,
    setSelection,
    validationMode: strict ? ("strict" as const) : ("recover" as const),
  };
  const viewers = {
    sequence: (
      <SequenceViewer
        {...shared}
        sequences={sequences}
        setSequences={(next) => {
          updateSequences(next);
          setAlignmentUpdates((count) => count + 1);
        }}
        enableAlignment={enableAlignment}
        alignmentConfig={{ urlCDN: new URL("/assets", location.origin).href }}
        containerClassName="caller-container"
        charClassName={() => "caller-char"}
        selectionClassName="caller-selection"
      />
    ),
    linear: (
      <LinearViewer
        {...shared}
        sequences={sequences}
        containerClassName="caller-linear"
      />
    ),
    circular: (
      <CircularViewer
        {...shared}
        sequence={sequences[0] ?? ""}
        containerClassName="caller-circular"
      />
    ),
  };
  const annotatedSequence = getAnnotatedSequence({
    sequence: sequences[0] ?? "",
    stackedAnnotations: [],
  });
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
      <section aria-label="Viewer controls">
        <textarea
          aria-label="Sequences"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button onClick={() => updateSequences(JSON.parse(draft))}>
          Apply sequences
        </button>
        <button
          onClick={() =>
            setSelection({
              start: 0,
              end: Math.max(0, ...sequences.map((sequence) => sequence.length)),
              direction: "forward",
            })
          }
        >
          Select all
        </button>
        <button onClick={() => updateSequences([])}>Clear sequences</button>
        <label>
          <input
            type="checkbox"
            checked={enableAlignment}
            onChange={(event) => setEnableAlignment(event.target.checked)}
          />
          Enable alignment
        </label>
        <label>
          <input
            type="checkbox"
            checked={invalidAnnotations}
            onChange={(event) => setInvalidAnnotations(event.target.checked)}
          />
          Invalid annotations
        </label>
        <label>
          <input
            type="checkbox"
            checked={strict}
            onChange={(event) => setStrict(event.target.checked)}
          />
          Strict validation
        </label>
      </section>
      {Object.entries(viewers).map(([name, viewer]) => (
        <section key={name} data-testid={`${name}-viewer`}>
          <ErrorBoundary key={`${strict}-${invalidAnnotations}`}>
            {viewer}
          </ErrorBoundary>
        </section>
      ))}
      <section data-testid="secondary-sequence-viewer">
        <SequenceViewer sequences={["TG"]} hideMetadataBar />
      </section>
      <section data-testid="standalone-ticks">
        <ReferenceTicks sequence={annotatedSequence} />
      </section>
      {annotatedSequence.length > 0 && (
        <section data-testid="standalone-gutter">
          <LinearAnnotationGutter
            sequence={annotatedSequence}
            stackedAnnotations={[{ ...feature, stack: 0 }]}
          />
        </section>
      )}
      <output data-testid="sequence-output">{JSON.stringify(sequences)}</output>
      <output data-testid="selection-output">
        {JSON.stringify(selection)}
      </output>
      <output data-testid="alignment-updates">{alignmentUpdates}</output>
      {virtualMode === "1" && <VirtualSequenceFixture />}
      {virtualMode === "window" && <WindowVirtualSequenceFixture />}
    </main>
  );
}

function WindowVirtualSequenceFixture() {
  return (
    <section
      data-testid="window-virtual-sequence-viewer"
      style={{ overflow: "auto" }}
    >
      <SequenceViewer
        sequences={["ACGT".repeat(5_000)]}
        hideMetadataBar
        charClassName={() => "window-virtual-char"}
      />
    </section>
  );
}

function VirtualSequenceFixture() {
  const [selection, setSelection] = useState<AriadneSelection | null>({
    start: 0,
    end: 0,
    direction: "forward",
  });
  const [narrow, setNarrow] = useState(false);
  const [annotationClicks, setAnnotationClicks] = useState(0);
  const sequence = "ACGT".repeat(5_000);
  return (
    <section data-testid="virtual-sequence-viewer">
      <button
        onClick={() =>
          setSelection({
            start: 15_000,
            end: 15_010,
            direction: "forward",
          })
        }
      >
        Select offscreen range
      </button>
      <button onClick={() => setNarrow((value) => !value)}>
        Resize viewer
      </button>
      <div
        data-testid="virtual-scroll-container"
        style={{ height: 360, overflow: "auto", width: narrow ? 520 : 900 }}
      >
        <SequenceViewer
          sequences={[sequence, sequence]}
          annotations={[
            {
              ...feature,
              start: 15_000,
              end: 15_010,
              text: "Virtual feature",
              onClick: () => setAnnotationClicks((count) => count + 1),
            },
          ]}
          selection={selection}
          setSelection={setSelection}
          charClassName={() => "virtual-char"}
        />
      </div>
      <output data-testid="virtual-selection">
        {JSON.stringify(selection)}
      </output>
      <output data-testid="virtual-annotation-clicks">
        {annotationClicks}
      </output>
      <div
        data-testid="many-row-scroll-container"
        style={{ height: 240, overflow: "auto", width: 900 }}
      >
        <SequenceViewer
          sequences={Array.from({ length: 10_000 }, () => "ACGTACGT")}
          hideMetadataBar
        />
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
