import { useState } from "react";
import { SequenceViewer } from ".";
import type { AnnotatedBase, AriadneSelection } from "../types";

export default {
  title: "Ariadne/SequenceViewer/Alignment",
  component: SequenceViewer,
};

export const AlignmentTest = () => {
  const initialFasta = `>x2_1aab_
GKGDPKKPRGKMSSYAFFVQTSREEHKKKHPDASVNFSEFSKKCSERWKTMSAKEKGKFEDMAKADKARYEREMKTYIPPKGE
>1j46_A
MQDRVKRPMNAFIVWSRDQRRKMALENPRMRNSEISKQLGYQWKMLTEAEKWPFFQEAQKLQAMHREKYPNYKYRPRRKAKMLPK`;

  const [sequences, setSequences] = useState<string[]>(() => {
    const lines = initialFasta.split("\n");
    const seqs: string[] = [];
    let currentSeq = "";

    for (const line of lines) {
      if (line.startsWith(">")) {
        if (currentSeq) {
          seqs.push(currentSeq);
          currentSeq = "";
        }
      } else {
        currentSeq += line.trim();
      }
    }
    if (currentSeq) {
      seqs.push(currentSeq);
    }

    return seqs;
  });

  const [selection, setSelection] = useState<AriadneSelection | null>(null);

  const charClassName = ({
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => {
    if (sequenceIdx === 0) {
      return "text-sequences-primary";
    } else if (sequenceIdx === 1) {
      return "dark:text-indigo-300 text-indigo-600";
    }
    return "text-sequences-foreground";
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="mb-2 text-lg font-semibold">MAFFT Alignment Test</h3>
        <p className="mb-4 text-sm text-gray-600">
          Click the &quot;Align&quot; button in the metadata bar to align the
          sequences using MAFFT E-INS-i algorithm.
        </p>
      </div>

      <SequenceViewer
        sequences={sequences}
        setSequences={setSequences}
        annotations={[]}
        selection={selection}
        setSelection={setSelection}
        charClassName={charClassName}
        highlightMisalignments={true}
      />

      <div className="mt-4 rounded bg-gray-100 p-4">
        <h4 className="mb-2 font-semibold">Current Sequences:</h4>
        <pre className="overflow-x-auto text-xs">
          {sequences.map((seq, idx) => (
            <div key={idx}>
              <span className="text-gray-500">Sequence {idx + 1}:</span> {seq}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

export const AlignmentWithAnnotations = () => {
  const initialFasta = `>x2_1aab_
GKGDPKKPRGKMSSYAFFVQTSREEHKKKHPDASVNFSEFSKKCSERWKTMSAKEKGKFEDMAKADKARYEREMKTYIPPKGE
>1j46_A
MQDRVKRPMNAFIVWSRDQRRKMALENPRMRNSEISKQLGYQWKMLTEAEKWPFFQEAQKLQAMHREKYPNYKYRPRRKAKMLPK`;

  const [sequences, setSequences] = useState<string[]>(() => {
    const lines = initialFasta.split("\n");
    const seqs: string[] = [];
    let currentSeq = "";

    for (const line of lines) {
      if (line.startsWith(">")) {
        if (currentSeq) {
          seqs.push(currentSeq);
          currentSeq = "";
        }
      } else {
        currentSeq += line.trim();
      }
    }
    if (currentSeq) {
      seqs.push(currentSeq);
    }

    return seqs;
  });

  const [selection, setSelection] = useState<AriadneSelection | null>(null);

  const charClassName = ({
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => {
    if (sequenceIdx === 0) {
      return "text-sequences-primary";
    } else if (sequenceIdx === 1) {
      return "dark:text-indigo-300 text-indigo-600";
    }
    return "text-sequences-foreground";
  };

  const annotations = [
    {
      start: 0,
      end: 10,
      direction: "forward" as const,
      text: "Alpha helix",
      className: "bg-blue-500/30",
      type: "secondary structure",
    },
    {
      start: 20,
      end: 35,
      direction: "forward" as const,
      text: "Beta sheet",
      className: "bg-green-500/30",
      type: "secondary structure",
    },
    {
      start: 50,
      end: 65,
      direction: "forward" as const,
      text: "Binding site",
      className: "bg-red-500/30",
      type: "functional",
    },
  ];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="mb-2 text-lg font-semibold">
          MAFFT Alignment with Annotations
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Test alignment with existing annotations. The annotations should
          remain after alignment.
        </p>
      </div>

      <SequenceViewer
        sequences={sequences}
        setSequences={setSequences}
        annotations={annotations}
        selection={selection}
        setSelection={setSelection}
        charClassName={charClassName}
        containerClassName="bg-sequences-background border rounded-lg"
        highlightMisalignments={true}
      />
    </div>
  );
};
