import { useCircularSelectionRect } from "@Ariadne/hooks/useSelection";
import {
  AnnotatedSequence,
  Annotation,
  AriadneSelection,
} from "@Ariadne/types";
import {
  getAnnotatedSequence,
  getStackedAnnotations,
  getSubsequenceLength,
} from "@Ariadne/utils";
import { classNames } from "@utils/stringUtils";
import { useEffect, useMemo, useRef } from "react";
import { stackAnnsByType } from "..";
import { CircularAnnotationGutter } from "./CircularAnnotations";
import { CircularIndex } from "./CircularIndex";
import { clampSlice, findIndexFromAngle, genArc } from "./circularUtils";

export interface Props {
  sequence: string;
  annotations: Annotation[];
  selection: AriadneSelection | null;
  setSelection: (selection: AriadneSelection) => void;
  containerClassName?: string;
  svgSizePX?: number;
  svgPadding?: number;
}

export const CircularViewer = ({
  sequence,
  annotations,
  selection,
  setSelection,
  containerClassName,
  svgSizePX = 300,
  svgPadding = 20,
}: Props) => {
  const { cx, cy, sizeX, sizeY, radius } = {
    cx: svgSizePX / 2,
    cy: svgSizePX / 2,
    sizeX: svgSizePX,
    sizeY: svgSizePX,
    radius: (svgSizePX - (svgPadding + 2)) / 2, // padding +2 to account for stroke width
  };
  const stackedAnnotations = stackAnnsByType(annotations);
  const annotatedSequence = useMemo(
    function memoize() {
      return getAnnotatedSequence({
        sequence,
        stackedAnnotations: getStackedAnnotations(annotations),
      });
    },
    [sequence, annotations],
  );

  if (annotatedSequence && selection && annotatedSequence.length > 0) {
    const firstIdx =
      annotatedSequence.length > 0 ? annotatedSequence.at(0)!.index : 0;
    const lastIdx =
      annotatedSequence.length > 0 ? annotatedSequence.at(-1)!.index : 0;
    selection = clampSlice({ slice: selection, firstIdx, lastIdx });
  }
  const selectionRef = useRef<SVGSVGElement>(null);

  return (
    <div
      className={classNames(
        "text-sequences-primary flex items-center justify-center font-thin select-none",
        containerClassName,
      )}
    >
      <svg
        ref={selectionRef}
        viewBox={`0 0 ${sizeX} ${sizeY}`}
        xmlns="http://www.w3.org/2000/svg"
        fontFamily="inherit"
        fontSize="inherit"
        fontWeight="inherit"
        className={`stroke-current`}
        width={sizeX}
        height={sizeY}
      >
        <CircularIndex
          cx={cx}
          cy={cy}
          radius={radius}
          annotatedSequence={annotatedSequence}
          ticks={4}
        />
        <CircularAnnotationGutter
          annotatedSequence={annotatedSequence}
          stackedAnnotations={stackedAnnotations}
          cx={cx}
          cy={cy}
          radius={radius}
        />
        <CircularSelection
          annotatedSequence={annotatedSequence}
          selection={selection}
          cx={cx}
          cy={cy}
          radius={radius}
          selectionRef={selectionRef}
          setSelection={setSelection}
        />

        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          fill="currentColor"
          stroke="currentColor"
          alignmentBaseline="middle"
          fontSize={"1rem"}
        >
          {annotatedSequence.length} bp
        </text>
      </svg>
    </div>
  );
};

const CircularSelection = ({
  radius,
  cx,
  cy,
  selection,
  selectionRef,
  setSelection,
  annotatedSequence,
}: {
  radius: number;

  cx: number;
  cy: number;
  selectionRef: React.RefObject<SVGSVGElement>;
  setSelection: (selection: AriadneSelection) => void;
  selection: AriadneSelection | null;
  annotatedSequence: AnnotatedSequence;
}) => {
  /* Collect internal selection data and propogate up */
  const {
    start: internalSelectionStart,
    end: internalSelectionEnd,
    direction: internalDirection,
  } = useCircularSelectionRect(selectionRef);
  useEffect(
    function propagateSelectionUp() {
      if (
        selectionRef.current &&
        internalSelectionStart &&
        internalSelectionEnd &&
        internalDirection
      ) {
        const start = findIndexFromAngle({
          angle: internalSelectionStart,
          seqLength: annotatedSequence.length,
        });
        const end = findIndexFromAngle({
          angle: internalSelectionEnd,
          seqLength: annotatedSequence.length,
        });
        const direction =
          internalDirection === "clockwise" ? "forward" : "reverse";

        const prevLength = selection
          ? Math.abs(selection.end - selection.start)
          : 0;
        const newLength = getSubsequenceLength(
          { start, end, direction },
          annotatedSequence.length,
        );
        const deltaLength = Math.abs(prevLength - newLength);
        const deltaThreshold = Math.max(0.7 * annotatedSequence.length, 10);
        if (deltaLength > deltaThreshold && selection) {
          // preserve initial direction
          setSelection({
            start,
            end,
            direction: selection?.direction,
          });

          return;
        }
        setSelection({
          start,
          end,
          direction,
        });
      }
    },
    [internalSelectionStart, internalSelectionEnd],
  );

  if (selection === null) {
    return null;
  }

  /* Display selection data that has trickled down */
  const { start, end } = selection;
  if (start === null || end === null) {
    return null;
  }
  const center = { x: cx, y: cy };
  const innerRadius = radius;
  const outerRadius = radius + 10;
  const length = getSubsequenceLength(selection, annotatedSequence.length);

  const [startIdx, endIdx] = [
    annotatedSequence.at(0)?.index,
    annotatedSequence.at(-1)?.index,
  ];
  if (startIdx === undefined || endIdx === undefined) {
    console.error("CircularViewer: sequence has no indices");
    return null;
  }
  const offset = start - startIdx;
  const seqLength = annotatedSequence.length;

  const arc = genArc({
    center,
    innerRadius,
    largeArc: length > seqLength / 2,
    length,
    offset,
    outerRadius,
    seqLength,
  });
  return (
    <g>
      <path
        d={arc}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};
