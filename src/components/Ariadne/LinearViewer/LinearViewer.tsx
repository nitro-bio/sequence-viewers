import { useLinearSelectionRect } from "@Ariadne/hooks/useSelection";
import {
  getAnnotatedSequence,
  getSubsequenceLength,
  stackAnnotationsNoOverlap,
} from "@Ariadne/utils";
import { classNames } from "@utils/stringUtils";
import { useEffect, useMemo, useRef } from "react";
import {
  AnnotatedBase,
  AnnotatedSequence,
  Annotation,
  AriadneSelection,
  StackedAnnotation,
} from "../types";
import { LinearAnnotationGutter } from "./LinearAnnotationGutter";
import { ViewerValidationMessages } from "../ViewerValidationMessages";
import {
  normalizeAnnotationsInput,
  resolveValidationMode,
  validateViewerInput,
  type ValidationMode,
} from "../validation";
import { clampSlice } from "../CircularViewer/circularUtils";
import { getMaxSequenceLength } from "../viewerUtils";

export interface Props {
  sequences: string[];
  annotations?: Annotation[];
  selection: AriadneSelection | null;
  setSelection: (selection: AriadneSelection | null) => void;
  onDoubleClick?: () => void;
  selectionClassName?: (selection: AriadneSelection) => string;
  containerClassName?: string;
  sequenceClassName?: ({
    sequenceIdx,
  }: {
    sequenceIdx: number;
  }) => string | string;
  mismatchClassName?: (mismatchedBase: AnnotatedBase) => string;
  stackingFn?: (annotations: Annotation[]) => StackedAnnotation[];
  validationMode?: ValidationMode;
  /** @deprecated Use validationMode. */
  noValidate?: boolean;
}

const MISMATCH_DIST_PERC_THRESHOLD = 0.01;

export const LinearViewer = (props: Props) => {
  const {
    sequences,
    selection,
    annotations,
    setSelection,
    onDoubleClick,
    selectionClassName,
    mismatchClassName,
    containerClassName,
    sequenceClassName,
    stackingFn,
    validationMode,
    noValidate,
  } = props;

  const annotationsInput = normalizeAnnotationsInput(annotations);
  const validation = useMemo(
    () =>
      validateViewerInput({
        sequences,
        annotations: annotationsInput,
        mode: resolveValidationMode({ validationMode, noValidate }),
      }),
    [annotationsInput, noValidate, sequences, validationMode],
  );
  const validatedSequences = validation.sequences;
  const maxSequenceLength = getMaxSequenceLength(validatedSequences);
  const validatedAnnotations = validation.annotations;

  const stackedAnnotations = useMemo(
    function memoize() {
      if (validation.hasUnsafeSequenceData) {
        return [];
      }
      // if a stacking function is provided, use it, otherwise use the default which
      // stacks annotations to prevent overlap.
      return stackingFn
        ? stackingFn(validatedAnnotations)
        : stackAnnotationsNoOverlap(validatedAnnotations, maxSequenceLength);
    },
    [
      stackingFn,
      validatedAnnotations,
      maxSequenceLength,
      validation.hasUnsafeSequenceData,
    ],
  );

  const annotatedSequences = useMemo(
    function memoize() {
      return validatedSequences.map((sequence) =>
        getAnnotatedSequence({ sequence, stackedAnnotations }),
      );
    },
    [validatedSequences, stackedAnnotations],
  );

  const baseSequence = annotatedSequences[0];
  const hasSequenceData = annotatedSequences.some(
    (annotatedSequence) => annotatedSequence.length > 0,
  );
  const displayedSelection =
    maxSequenceLength === 0
      ? null
      : clampSlice({
          slice: selection,
          firstIdx: 0,
          lastIdx: maxSequenceLength - 1,
        });
  const selectionRef = useRef<SVGSVGElement>(null);

  // const numberOfTicks = 5;
  // const basesPerTick = Math.floor(sequence.length / numberOfTicks);

  const SVG_WIDTH = 500;
  const SVG_HEIGHT = validatedSequences.length * 10 + 10;

  const getSequenceClassNameProp = ({
    sequenceIdx,
  }: {
    sequenceIdx: number;
  }) => {
    let userProvided = "";
    if (typeof sequenceClassName === "function") {
      userProvided = sequenceClassName({ sequenceIdx });
    } else if (typeof sequenceClassName === "string") {
      userProvided = sequenceClassName;
    }
    return classNames(
      userProvided,
      sequenceIdx == 0 && "nsv-linear-primary",
      sequenceIdx > 0 && "nsv-linear-secondary",
    );
  };

  if (validation.hasUnsafeSequenceData) {
    return (
      <ViewerValidationMessages
        diagnostics={validation.diagnostics}
        sequenceUnavailable
      />
    );
  }
  if (!hasSequenceData) {
    return (
      <div
        className={classNames("nsv-root", containerClassName)}
        data-empty="true"
      >
        <ViewerValidationMessages diagnostics={validation.diagnostics} />
      </div>
    );
  }

  return (
    <div className={classNames("nsv-root", containerClassName)}>
      <ViewerValidationMessages diagnostics={validation.diagnostics} />
      <svg
        ref={selectionRef}
        className={classNames("nsv:[font-weight:100] nsv:select-none")}
        onDoubleClick={onDoubleClick}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          {annotatedSequences.map((sequence, i) => (
            <g key={`Sequence-${i}`}>
              <SequenceLine
                sequenceClassName={getSequenceClassNameProp({ sequenceIdx: i })}
                baseSequence={sequence}
                alignedSequences={annotatedSequences.filter((_, j) => j !== i)}
                sequenceIdx={i}
                mismatchClassName={mismatchClassName}
              />
            </g>
          ))}
        </g>
        {baseSequence?.length > 0 && (
          <LinearSelection
            selectionClassName={selectionClassName}
            selectionRef={selectionRef}
            selection={displayedSelection}
            setSelection={setSelection}
            sequence={baseSequence}
          />
        )}
      </svg>
      {stackedAnnotations.length > 0 && baseSequence?.length > 0 && (
        <LinearAnnotationGutter
          containerClassName=""
          stackedAnnotations={stackedAnnotations}
          sequence={baseSequence}
        />
      )}
    </div>
  );
};

interface SequenceLineProps {
  baseSequence: AnnotatedSequence;
  sequenceIdx: number;
  alignedSequences: AnnotatedSequence[];
  sequenceClassName?: string;
  mismatchClassName?: (mismatchedBase: AnnotatedBase) => string;
}

const SequenceLine = ({
  baseSequence,
  sequenceIdx,
  alignedSequences,
  sequenceClassName,
  mismatchClassName,
}: SequenceLineProps) => {
  const start = baseSequence[0]?.index;
  if (start === undefined) {
    return null;
  }
  const end = baseSequence[baseSequence.length - 1]?.index;
  if (end === undefined) {
    return null;
  }

  let maxEnd = end;
  alignedSequences.forEach((alignedSequence) => {
    const otherEnd = alignedSequence.at(alignedSequence.length - 1)?.index;
    if (otherEnd === undefined) {
      return;
    }

    if (otherEnd > maxEnd) {
      maxEnd = otherEnd;
    }
  });
  const coordinateDenominator = maxEnd === 0 ? 1 : maxEnd;
  const startPerc = start / coordinateDenominator;
  const endPerc = maxEnd === 0 ? 1 : end / coordinateDenominator;

  // mismatches
  const mismatches = baseSequence.filter((base) => {
    const rootBase = baseSequence.at(base.index);
    return rootBase && rootBase.base !== base.base;
  });
  mismatchClassName =
    mismatchClassName ??
    function mismatchClassName(mismatch: AnnotatedBase) {
      if (mismatch.base === "-") {
        return "nsv:fill-black nsv:stroke-black nsv:opacity-80";
      } else {
        return "nsv:dark:fill-red-600 nsv:dark:stroke-red-600 nsv:fill-red-700 nsv:stroke-red-700";
      }
    };

  let lastXPerc = -1;

  return (
    <>
      <line
        className={classNames("", sequenceClassName)}
        x1={`${startPerc * 100}%`}
        y1={`${sequenceIdx * 10 + 10}`}
        x2={`${endPerc * 100}%`}
        y2={`${sequenceIdx * 10 + 10}`}
        strokeWidth={5}
        stroke="currentColor"
      />
      {mismatches.map((base) => {
        const xPerc = (base.index / coordinateDenominator) * 100;
        const width = Math.max((1 / baseSequence.length) * 100, 0.01);
        const diff = xPerc - lastXPerc;
        if (diff < MISMATCH_DIST_PERC_THRESHOLD) {
          // Displaying every mismatch is not particularly helpful because
          // the user will not be able to see them. Here we choose a reasonable
          // threshold and only display elements that are sufficiently far apart.
          return null;
        }
        lastXPerc = xPerc;
        return (
          <g
            className={classNames(
              mismatchClassName?.(base) || "nsv:bg-red-400",
            )}
            key={`sequence-${sequenceIdx}-mismatch-${base.index}`}
          >
            <line
              x1={`${xPerc - width / 2}%`}
              y1={`${sequenceIdx * 10 + 10}`}
              x2={`${xPerc + width / 2}%`}
              y2={`${sequenceIdx * 10 + 10}`}
              strokeWidth={5}
            />
          </g>
        );
      })}
    </>
  );
};

const LinearSelection = ({
  selection,
  selectionRef,
  setSelection,
  sequence,
  selectionClassName,
}: {
  selectionRef: React.RefObject<SVGSVGElement>;
  setSelection: (selection: AriadneSelection) => void;
  selection: AriadneSelection | null;
  sequence: AnnotatedSequence;
  selectionClassName?: (selection: AriadneSelection) => string;
}) => {
  const latestSelection = useRef(selection);
  const latestSetSelection = useRef(setSelection);
  useEffect(() => {
    latestSelection.current = selection;
    latestSetSelection.current = setSelection;
  }, [selection, setSelection]);
  const {
    start: internalSelectionStart,
    end: internalSelectionEnd,
    direction: internalDirection,
  } = useLinearSelectionRect({ ref: selectionRef });
  useEffect(
    function propagateSelectionUp() {
      if (
        selectionRef.current &&
        internalSelectionStart &&
        internalSelectionEnd
      ) {
        const svgWidth = selectionRef.current?.getBoundingClientRect().width;
        const start = Math.floor(
          (internalSelectionStart.x / svgWidth) * sequence.length,
        );
        const end = Math.floor(
          (internalSelectionEnd.x / svgWidth) * sequence.length,
        );

        // show a very small first selection result as start === end because the user probably doesn't want the entire sequence to be highlighted every time they click
        if (latestSelection.current == null || start === end) {
          latestSetSelection.current({
            start,
            end: start + 1,
            direction: internalDirection,
          });
          return;
        } else {
          latestSetSelection.current({
            start,
            end,
            direction: internalDirection,
          });
        }
      }
    },
    [
      internalDirection,
      internalSelectionEnd,
      internalSelectionStart,
      selectionRef,
      sequence.length,
    ],
  );

  if (!selection) {
    return null;
  }

  /* Display selection data that has trickled down */
  const { start, end } = selection;

  // basic case
  let firstRectStart = (Math.min(start, end) / sequence.length) * 100;
  let firstRectWidth =
    (getSubsequenceLength(selection, sequence.length) / sequence.length) * 100;
  let secondRectStart = null;
  let secondRectWidth = null;

  // TODO: abstract this and logic in LinearAnnotation into helper functions
  const selectionSpansSeam = selection.start > selection.end;

  /* if direction is backward and end > start we need to render two rectangles */
  if (selectionSpansSeam) {
    firstRectStart = 0;
    firstRectWidth = (end / sequence.length) * 100;
    secondRectStart = (start / sequence.length) * 100;
    secondRectWidth = ((sequence.length - start) / sequence.length) * 100;
  }

  return (
    <g
      className={classNames(
        "nsv:fill-current nsv:stroke-current",
        "nsv-linear-selection",
        selectionClassName?.(selection),
      )}
    >
      <rect
        x={`${firstRectStart}%`}
        width={`${firstRectWidth}%`}
        y={`0%`}
        height={`100%`}
        fill="currentColor"
        fillOpacity={0.2}
        strokeWidth={1.5}
      />
      {secondRectStart && secondRectWidth && (
        <rect
          x={`${secondRectStart}%`}
          width={`${secondRectWidth}%`}
          y={`0%`}
          height={`100%`}
          fill="currentColor"
          fillOpacity={0.2}
          strokeWidth={1.5}
        />
      )}
    </g>
  );
};
