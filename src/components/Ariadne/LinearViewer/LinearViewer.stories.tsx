import { generateRandomAlignedSequences } from "@Ariadne/storyUtils";
import { AriadneSelection } from "@Ariadne/types";

import { useMemo, useState } from "react";
import { LinearViewer } from ".";
import { stackAnnsByType } from "@Ariadne/utils";

export default {
  title: "Ariadne/LinearViewer",
  component: LinearViewer,
};

const classNameBySequenceIdx = ({ sequenceIdx }: { sequenceIdx: number }) => {
  if (sequenceIdx === 0) {
    return "";
  } else if (sequenceIdx === 1) {
    return "dark:text-indigo-300 text-indigo-600";
  } else if (sequenceIdx === 2) {
    return "dark:text-amber-300 text-amber-600";
  } else {
    return "dark:text-brand-300/50 text-brand-600/50";
  }
};

const LinearStory = ({
  initialSelection,
  selectionClassName,
  maxSequences,
  maxSequenceLength,
}: {
  initialSelection?: AriadneSelection;
  maxSequences?: number;
  maxSequenceLength?: number;
  selectionClassName?: (selection: AriadneSelection) => string;
}) => {
  const { sequences, annotations } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: maxSequences || 5,
        maxLength: maxSequenceLength || 100,
      }),
    [],
  );

  const [selection, setSelection] = useState<AriadneSelection | null>(
    initialSelection ?? null,
  );

  return (
    <div className="w-full max-w-3xl px-8">
      <LinearViewer
        sequences={sequences}
        annotations={annotations}
        selection={selection}
        setSelection={setSelection}
        selectionClassName={selectionClassName}
      />
    </div>
  );
};

export const LinearViewerStory = () => {
  return <LinearStory />;
};
export const LinearViewerStoryForwardSelectionOverSeam = () => {
  return (
    <LinearStory
      initialSelection={{
        start: 10,
        end: 5,
        direction: "forward",
      }}
    />
  );
};

export const LinearViewerStoryReverseSelection = () => {
  return (
    <LinearStory
      initialSelection={{
        start: 10,
        end: 5,
        direction: "reverse",
      }}
    />
  );
};
export const LinearViewerStoryReverseSelectionOverSeam = () => {
  return (
    <LinearStory
      initialSelection={{
        start: 5,
        end: 10,
        direction: "reverse",
      }}
    />
  );
};
export const LinearViewerStorySelectionClassName = () => {
  return (
    <LinearStory
      initialSelection={{
        start: 5,
        end: 10,
        direction: "reverse",
      }}
      selectionClassName={(selection: AriadneSelection) => {
        if (Math.abs(selection.end - selection.start) > 100) {
          return "bg-red-500 fill-red-500 text-red-500";
        } else {
          return "bg-blue-500 fill-blue-500 text-blue-500";
        }
      }}
    />
  );
};
export const LinearViewerStoryManyAnnotations = () => {
  const { sequences, annotations } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: 4,
        maxLength: 10000,
        maxAnnotations: 50,
      }),
    [],
  );
  const [selection, setSelection] = useState<AriadneSelection | null>(null);

  return (
    <div className="w-full max-w-3xl px-8">
      <LinearViewer
        containerClassName="text-brand-400 "
        sequences={sequences}
        annotations={annotations}
        selection={selection}
        setSelection={setSelection}
        sequenceClassName={classNameBySequenceIdx}
      />
    </div>
  );
};

export const LinearViewerStoryLongSequence = () => {
  const { sequences, annotations } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: 1,
        maxLength: 100000,
      }),
    [],
  );
  const [selection, setSelection] = useState<AriadneSelection | null>(null);

  return (
    <div className="w-full max-w-3xl px-8">
      <LinearViewer
        containerClassName="text-brand-400 "
        sequences={sequences}
        annotations={annotations}
        selection={selection}
        setSelection={setSelection}
        sequenceClassName={classNameBySequenceIdx}
      />
    </div>
  );
};
export const LinearViewerStoryLongSequenceManyMismatches = () => {
  const { sequences, annotations } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: 4,
        maxLength: 100000,
      }),
    [],
  );
  const [selection, setSelection] = useState<AriadneSelection | null>(null);

  return (
    <div className="w-full max-w-3xl px-8">
      <LinearViewer
        containerClassName="text-brand-400 "
        sequences={sequences}
        annotations={annotations}
        selection={selection}
        setSelection={setSelection}
        sequenceClassName={classNameBySequenceIdx}
      />
    </div>
  );
};

export const LinearViewerStoryStackAnnotationsByType = () => {
  const { sequences, annotations } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: 4,
        maxLength: 10000,
        maxAnnotations: 10,
      }),
    [],
  );
  const [selection, setSelection] = useState<AriadneSelection | null>(null);

  return (
    <div className="w-full max-w-3xl px-8">
      <LinearViewer
        containerClassName="text-brand-400 "
        sequences={sequences}
        annotations={annotations}
        selection={selection}
        setSelection={setSelection}
        stackingFn={stackAnnsByType}
      />
    </div>
  );
};
