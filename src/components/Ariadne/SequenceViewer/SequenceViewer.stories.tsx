import { generateRandomAlignedSequences } from "@Ariadne/storyUtils";

import { useMemo, useState } from "react";

import { SequenceViewer } from ".";
import type { AnnotatedBase, AriadneSelection } from "../types";
import "./smartSelectionDemo.css";

export default {
  title: "Ariadne/SequenceViewer",
  component: SequenceViewer,
};

const SequenceStory = ({
  numSequences,
  initialSelection,
  containerClassName,
  hideMetadataBar,
  charClassName,
}: {
  numSequences: number;
  initialSelection?: AriadneSelection;
  containerClassName?: string;
  charClassName?: ({
    base,
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => string;
  hideMetadataBar?: boolean;
}) => {
  const [selection, setSelection] = useState<AriadneSelection | null>(
    initialSelection ?? null,
  );
  const { sequences, annotations } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: numSequences,
        maxLength: 1000,
      }),
    [numSequences],
  );

  const defaultCharClassName = ({ sequenceIdx }: { sequenceIdx: number }) => {
    if (sequenceIdx === 0) {
      return "text-sequences-primary";
    } else if (sequenceIdx === 1) {
      return "dark:text-indigo-300 text-indigo-600";
    } else if (sequenceIdx === 2) {
      return "dark:text-amber-300 text-amber-600";
    } else {
      return "";
    }
  };

  return (
    <div className="grid min-h-screen content-center py-8">
      <div className="max-w-4xl">
        <SequenceViewer
          sequences={[...sequences].sort((a, b) => a.length - b.length)}
          annotations={annotations}
          selection={selection}
          charClassName={charClassName ?? defaultCharClassName}
          containerClassName={containerClassName}
          setSelection={setSelection}
          hideMetadataBar={hideMetadataBar}
        />
      </div>
    </div>
  );
};

export const OneSequence = () => <SequenceStory numSequences={1} />;
export const TwoSequences = () => <SequenceStory numSequences={2} />;
export const EightSequences = () => <SequenceStory numSequences={8} />;

export const SmartSelection = () => {
  const sequences = [
    "ATGACCTGACGTTAGCTAGCATGCTAGCTACGATCGATGCTAGCTAGGCTAACGTTAGCTAGCATGCTAGCTACGATCGATGCTAGCTAGGCTAACGT",
    "ATGACC--ACGTTAGCTAGCATGCTAGCTACGATCGATGCTAGCTAGGCTAACGTTAGCTAGCATGCTAGCTACGATCGATGCTAGCTAGGCTAACGT",
    "ATGACCTGACGTTAGCTAGCATGCTAGCTACGATCGATGCTAGCTAGGCTAACGTTAGCTAGCATGC",
  ];
  const colors = [
    "smart-selection-green",
    "smart-selection-indigo",
    "smart-selection-amber",
  ];
  const [selection, setSelection] = useState<AriadneSelection | null>({
    start: 4,
    end: 15,
    direction: "forward",
    sequenceIdx: 1,
  });
  const [customHighlight, setCustomHighlight] = useState(false);

  return (
    <main className="smart-selection-demo">
      <header>
        <p className="smart-selection-eyebrow">Sequence viewer demo</p>
        <h1>Start anywhere. Stay on that sequence.</h1>
        <p className="smart-selection-intro">
          Drag across characters in any row. The starting sequence stays
          selected, even when you drag backward or cross another row. Try
          starting on a gap, too.
        </p>
      </header>

      <div className="smart-selection-legend">
        {colors.map((color, index) => (
          <span key={color} className={color}>
            ● Sequence {index + 1}
          </span>
        ))}
      </div>

      <section className="smart-selection-viewer">
        <SequenceViewer
          sequences={sequences}
          selection={selection}
          setSelection={setSelection}
          charClassName={({ sequenceIdx }) => colors[sequenceIdx]}
          selectionClassName={
            customHighlight ? "smart-selection-override" : undefined
          }
          hideDownloadButton
          positionLabelRenderer="minimal"
        />
      </section>

      <div className="smart-selection-actions">
        <button
          className="smart-selection-primary"
          disabled={!selection}
          onClick={() => {
            if (selection) {
              setSelection({
                start: selection.start,
                end: selection.end,
                direction: selection.direction,
              });
            }
          }}
        >
          Select this range in all sequences
        </button>
        <button onClick={() => setSelection(null)}>Clear selection</button>
        <label>
          <input
            type="checkbox"
            checked={customHighlight}
            onChange={(event) => setCustomHighlight(event.target.checked)}
          />
          Override highlight with pink
        </label>
      </div>

      <p aria-live="polite" className="smart-selection-status">
        {selection
          ? `${selection.sequenceIdx === undefined ? "All sequences" : `Sequence ${selection.sequenceIdx + 1}`} · positions ${selection.start}–${selection.end} (zero-based) · copy as ${selection.sequenceIdx === undefined ? "FASTA" : "plain text"}`
          : "No selection. Drag over characters to begin."}
      </p>

      <label className="smart-selection-paste">
        <span>Copy your selection, then paste here</span>
        <textarea
          rows={6}
          placeholder={
            "Use the copy icon above or ⌘C / Ctrl+C.\nOne sequence copies as text; all sequences copy as FASTA."
          }
        />
      </label>
    </main>
  );
};

export const SequenceViewerStoryForwardSelectionOverSeam = () => (
  <SequenceStory
    numSequences={1}
    initialSelection={{
      start: 10,
      end: 5,
      direction: "forward",
    }}
  />
);

export const SequenceViewerStoryReverseSelection = () => (
  <SequenceStory
    numSequences={1}
    initialSelection={{
      start: 10,
      end: 5,
      direction: "reverse",
    }}
  />
);

export const SequenceViewerStoryReverseSelectionOverSeam = () => (
  <SequenceStory
    numSequences={1}
    initialSelection={{
      start: 5,
      end: 10,
      direction: "reverse",
    }}
  />
);

export const SequenceViewerStoryCustomClassNames = () => (
  <SequenceStory numSequences={1} containerClassName="text-xl skew-y-3" />
);

export const SequenceViewerStorySecondSequence = () => (
  <SequenceStory
    numSequences={2}
    initialSelection={{
      start: 5,
      end: 10,
      direction: "reverse",
      sequenceIdx: 1,
    }}
  />
);

export const SequenceViewerInvalid = () => {
  const charClassName = ({ sequenceIdx }: { sequenceIdx: number }) => {
    if (sequenceIdx === 0) {
      return "";
    } else if (sequenceIdx === 1) {
      return "dark:text-indigo-300 text-indigo-600";
    } else if (sequenceIdx === 2) {
      return "dark:text-amber-300 text-amber-600";
    } else {
      return "dark:text-zinc-300 text-zinc-600";
    }
  };

  return (
    <div className="grid h-screen content-center py-8">
      <div className="max-w-4xl">
        <SequenceViewer
          selectionClassName="bg-brand-400/20"
          sequences={["FAIL SEQUENCE"]}
          annotations={[]}
          selection={null}
          charClassName={charClassName}
          noValidate
          setSelection={() => {}}
        />
      </div>
    </div>
  );
};

export const HideMetadataBar = () => {
  return <SequenceStory numSequences={1} hideMetadataBar />;
};
