import { generateRandomAlignedSequences } from "@Ariadne/storyUtils";

import { useEffect, useMemo, useState } from "react";

import { SequenceViewer } from ".";
import type { AnnotatedBase, AriadneSelection } from "../types";

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
    [],
  );

  const defaultCharClassName = ({ sequenceIdx }: { sequenceIdx: number }) => {
    if (sequenceIdx === 0) {
      return "dark:text-brand-300 text-brand-600";
    } else if (sequenceIdx === 1) {
      return "dark:text-indigo-300 text-indigo-600";
    } else if (sequenceIdx === 2) {
      return "dark:text-amber-300 text-amber-600";
    } else {
      return "dark:text-noir-300 text-noir-600";
    }
  };

  return (
    <div className="grid min-h-screen content-center py-8">
      <div className="max-w-4xl">
        <SequenceViewer
          selectionClassName="bg-brand-400/20"
          sequences={sequences}
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
  <SequenceStory
    numSequences={1}
    containerClassName="text-xl bg-noir-800 skew-y-3"
  />
);

export const SequenceViewerStorySecondSequence = () => (
  <SequenceStory
    numSequences={1}
    initialSelection={{
      start: 5,
      end: 10,
      direction: "reverse",
    }}
  />
);

export const SequenceViewerInvalid = () => {
  const charClassName = ({ sequenceIdx }: { sequenceIdx: number }) => {
    if (sequenceIdx === 0) {
      return "dark:text-brand-300 text-brand-600";
    } else if (sequenceIdx === 1) {
      return "dark:text-indigo-300 text-indigo-600";
    } else if (sequenceIdx === 2) {
      return "dark:text-amber-300 text-amber-600";
    } else {
      return "dark:text-noir-300 text-noir-600";
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
export const SequenceViewerDarkMode = () => {
  // add "dark" className to body
  useEffect(function addDarkModeClass() {
    document.body.classList.add("dark");
    return function removeDarkModeClass() {
      document.body.classList.remove("dark");
    };
  }, []);
  return (
    <div className="bg-noir-800 ">
      <SequenceStory numSequences={3} />;
    </div>
  );
};

export const HideMetadataBar = () => {
  return <SequenceStory numSequences={1} hideMetadataBar />;
};

export const WithSparklineAnnotation = () => {
  const { sequences } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: 1,
        maxLength: 1000,
      }),
    [],
  );

  const charClassName = ({ sequenceIdx }: { sequenceIdx: number }) => {
    if (sequenceIdx === 0) {
      return "dark:text-brand-300 text-brand-600";
    } else if (sequenceIdx === 1) {
      return "dark:text-indigo-300 text-indigo-600";
    } else if (sequenceIdx === 2) {
      return "dark:text-amber-300 text-amber-600";
    } else {
      return "dark:text-noir-300 text-noir-600";
    }
  };
  return (
    <div className="grid min-h-screen content-center py-8">
      <div className="max-w-4xl">
        <SequenceViewer
          selectionClassName="bg-brand-400/20"
          sparkLineData={[
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            undefined,
            8,
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            undefined,
            8,
          ]}
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
