import { generateRandomAlignedSequences } from "@Ariadne/storyUtils";
import { AriadneSelection } from "@Ariadne/types";

import { useMemo, useState } from "react";

import { CircularViewer } from ".";

export default {
  title: "Ariadne/CircularViewer",
  component: CircularViewer,
};

const CircularStory = ({
  maxLength,
  initialSelection,
  numSequences,
}: {
  maxLength?: number;
  initialSelection?: AriadneSelection;
  numSequences?: number;
}) => {
  const [selection, setSelection] = useState<AriadneSelection | null>(
    initialSelection ?? null,
  );
  const { sequences, annotations } = useMemo(
    () =>
      generateRandomAlignedSequences({
        maxSequences: numSequences ?? 1,
        maxLength: maxLength ?? 1000,
        annotationOnClick: setSelection,
      }),
    [],
  );

  return (
    <div className="grid h-screen content-center">
      <div className="items-between flex max-w-5xl justify-around">
        {sequences.map((seq, idx) => (
          <CircularViewer
            key={idx}
            sequence={seq}
            annotations={annotations}
            selection={selection}
            setSelection={setSelection}
          />
        ))}
      </div>
    </div>
  );
};

export const MiniCircularViewerStory = () => <CircularStory maxLength={10} />;
export const CircularViewerStory = () => <CircularStory />;
export const TwoCircularViewerStory = () => <CircularStory numSequences={2} />;
export const CircularViewerStoryForwardSelectionOverSeam = () => (
  <CircularStory
    initialSelection={{
      start: 10,
      end: 5,
      direction: "forward",
    }}
  />
);

export const CircularViewerStoryReverseSelection = () => (
  <CircularStory
    initialSelection={{
      start: 1,
      end: 25,
      direction: "reverse",
    }}
  />
);

export const CircularViewerStoryReverseSelectionOverSeam = () => (
  <CircularStory
    initialSelection={{
      start: 5,
      end: 10,
      direction: "reverse",
    }}
  />
);
