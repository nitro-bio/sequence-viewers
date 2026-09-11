import {
  baseInSelection,
  downloadAsFasta,
  getAnnotatedSequence,
  stackAnnotationsNoOverlap,
} from "@Ariadne/utils";
import { classNames } from "@utils/stringUtils";
import {
  useMafftEinsi,
  type AlignmentConfig,
  type AlignState,
} from "../hooks/useMafftEinsi";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AnnotatedBase,
  Annotation,
  AriadneSelection,
  StackedAnnotation,
} from "../types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@ui/select";
import { CopyButton } from "@ui/copy-button";
import { Button } from "@ui/button/button";
import { DownloadIcon } from "lucide-react";
import { ViewerValidationMessages } from "../ViewerValidationMessages";
import {
  normalizeAnnotationsInput,
  resolveValidationMode,
  validateViewerInput,
  type ValidationMode,
} from "../validation";
import { clampSlice } from "../CircularViewer/circularUtils";
import { getMaxSequenceLength } from "../viewerUtils";

export const SequenceViewer = ({
  sequences,
  setSequences,
  annotations,
  selection,
  setSelection,
  containerClassName,
  charClassName,
  selectionClassName,
  hideMetadataBar,
  hideDownloadButton,
  noValidate,
  validationMode,
  highlightMisalignments,
  enableAlignment = false,
  alignmentConfig,
}: {
  sequences: string[];
  setSequences?: (sequences: string[]) => void;
  annotations?: Annotation[];
  selection: AriadneSelection | null;
  setSelection: (selection: AriadneSelection | null) => void;
  containerClassName?: string;
  charClassName: ({
    base,
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => string;
  selectionClassName?: string;
  hideMetadataBar?: boolean;
  hideDownloadButton?: boolean;
  /** @deprecated Use validationMode. */
  noValidate?: boolean;
  validationMode?: ValidationMode;
  highlightMisalignments?: boolean;
  enableAlignment?: boolean;
  alignmentConfig?: AlignmentConfig;
}) => {
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [seqIdxToCopy, setSeqIdxToCopy] = useState<number>(0);
  const [activeAnnotation, setActiveAnnotation] =
    useState<StackedAnnotation | null>(null);
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
  const validatedAnnotations = validation.annotations;
  const { state: alignState, run: runAlignment } = useMafftEinsi({
    sequences: validatedSequences,
    onAligned: setSequences,
    config: alignmentConfig,
    enabled: enableAlignment && !validation.hasUnsafeSequenceData,
  });
  const hasAlignmentInput =
    validatedSequences.length > 0 &&
    validatedSequences.every((sequence) => sequence.length > 0);

  const maxSequenceLength = getMaxSequenceLength(validatedSequences);
  const stackedAnnotations = useMemo(
    function memoize() {
      if (validation.hasUnsafeSequenceData) {
        return [];
      }
      return stackAnnotationsNoOverlap(validatedAnnotations, maxSequenceLength);
    },
    [validatedAnnotations, maxSequenceLength, validation.hasUnsafeSequenceData],
  );
  const annotatedSequences = useMemo(
    function memoize() {
      return validatedSequences.map((sequence) =>
        getAnnotatedSequence({ sequence, stackedAnnotations }),
      );
    },
    [validatedSequences, stackedAnnotations],
  );
  const displayedSelection = useMemo(
    () =>
      maxSequenceLength === 0
        ? null
        : clampSlice({
            slice: selection,
            firstIdx: 0,
            lastIdx: maxSequenceLength - 1,
          }),
    [maxSequenceLength, selection],
  );
  const safeSeqIdxToCopy = Math.max(
    0,
    Math.min(seqIdxToCopy, Math.max(annotatedSequences.length - 1, 0)),
  );
  const hasSequenceData = annotatedSequences.some(
    (annotatedSequence) => annotatedSequence.length > 0,
  );

  useEffect(
    function resetStaleMetadata() {
      if (seqIdxToCopy !== safeSeqIdxToCopy) {
        setSeqIdxToCopy(safeSeqIdxToCopy);
      }
      if (
        hoveredPosition !== null &&
        (hoveredPosition < 0 || hoveredPosition >= maxSequenceLength)
      ) {
        setHoveredPosition(null);
      }
      if (activeAnnotation && !stackedAnnotations.includes(activeAnnotation)) {
        setActiveAnnotation(null);
      }
    },
    [
      activeAnnotation,
      hoveredPosition,
      maxSequenceLength,
      safeSeqIdxToCopy,
      seqIdxToCopy,
      stackedAnnotations,
    ],
  );
  useEffect(
    function mountCopyHandler() {
      if (!hasSequenceData || !displayedSelection) {
        return;
      }
      const copyHandler = (e: ClipboardEvent) => {
        const stringToCopy = getStringToCopy(
          annotatedSequences,
          displayedSelection,
          safeSeqIdxToCopy,
        );
        if (!stringToCopy) {
          return;
        }
        e.clipboardData?.setData("text/plain", stringToCopy);
        e.preventDefault();
      };
      document.addEventListener("copy", copyHandler);
      return function unmountCopyHandler() {
        document.removeEventListener("copy", copyHandler);
      };
    },
    [annotatedSequences, displayedSelection, hasSequenceData, safeSeqIdxToCopy],
  );

  const memoizedSeqContent = useMemo(() => {
    return (
      <SeqContent
        annotatedSequences={annotatedSequences}
        selection={displayedSelection}
        setSelection={setSelection}
        setHoveredPosition={setHoveredPosition}
        setActiveAnnotation={setActiveAnnotation}
        stackedAnnotations={stackedAnnotations}
        charClassName={charClassName}
        selectionClassName={selectionClassName}
        highlightMisalignments={highlightMisalignments}
      />
    );
  }, [
    annotatedSequences,
    charClassName,
    displayedSelection,
    highlightMisalignments,
    selectionClassName,
    setSelection,
    stackedAnnotations,
  ]);

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
        className={classNames("nsv-root nsv-sequence-root", containerClassName)}
        data-empty="true"
      >
        <ViewerValidationMessages diagnostics={validation.diagnostics} />
      </div>
    );
  }
  return (
    <>
      <ViewerValidationMessages diagnostics={validation.diagnostics} />
      <div
        className={classNames("nsv-root nsv-sequence-root", containerClassName)}
      >
        {!hideMetadataBar && (
          <SeqMetadataBar
            hoveredPosition={hoveredPosition}
            activeAnnotation={activeAnnotation}
            className="nsv:sticky nsv:inset-x-0 nsv:top-0 nsv:z-3 nsv:w-full nsv:px-2 nsv:py-1 nsv:[backdrop-filter:blur(12px)]"
            annotatedSequences={annotatedSequences}
            charClassName={charClassName}
            seqIdxToCopy={safeSeqIdxToCopy}
            setSeqIdxToCopy={setSeqIdxToCopy}
            selection={displayedSelection}
            hideDownloadButton={hideDownloadButton}
            alignmentEnabled={enableAlignment}
            alignmentHasInput={hasAlignmentInput}
            alignmentCanUpdate={Boolean(setSequences)}
            onAlign={runAlignment}
            alignState={alignState}
          />
        )}
        <div className="nsv:flex nsv:flex-wrap nsv:px-2">
          {memoizedSeqContent}
        </div>
      </div>
    </>
  );
};
export const SeqContent = ({
  annotatedSequences,
  selection,
  setSelection,
  setHoveredPosition,
  setActiveAnnotation,
  stackedAnnotations,
  charClassName,
  selectionClassName,
  highlightMisalignments,
}: {
  annotatedSequences: AnnotatedBase[][];
  selection: AriadneSelection | null;
  setSelection: (selection: AriadneSelection | null) => void;
  setHoveredPosition: (position: number | null) => void;
  setActiveAnnotation: (annotation: StackedAnnotation | null) => void;
  stackedAnnotations: StackedAnnotation[];
  charClassName: ({
    base,
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => string;
  selectionClassName?: string;
  highlightMisalignments?: boolean;
}) => {
  const mouseDown = useRef(false);
  const handleMouseUp = useCallback(() => {
    mouseDown.current = false;
  }, []);
  const indicesClassName = ({
    base,
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => {
    const isNotFirstSeq = sequenceIdx !== 0;
    const isNotMultipleOfTen = base.index % 10 !== 0;

    if (isNotFirstSeq || isNotMultipleOfTen) {
      return "nsv:opacity-0";
    }
    return classNames(
      "nsv:text-[0.75rem]/[1rem] nsv:z-1",
      baseInSelection({
        baseIndex: base.index,
        selection,
        sequenceLength: annotatedSequences[sequenceIdx].length,
      })
        ? "nsv:text-sequences-primary nsv:group-hover:text-sequences-primary-muted"
        : "nsv:text-sequences-foreground nsv:group-hover:text-sequences-primary",
    );
  };
  useEffect(
    function addMouseUpListener() {
      document.addEventListener("mouseup", handleMouseUp);
      return function removeMouseUpListener() {
        document.removeEventListener("mouseup", handleMouseUp);
      };
    },
    [handleMouseUp],
  );

  const maxSequenceLength = annotatedSequences.reduce(
    (maxLength, sequence) => Math.max(maxLength, sequence.length),
    0,
  );
  const maxAnnotationStack = stackedAnnotations.reduce(
    (maxStack, annotation) => Math.max(maxStack, annotation.stack),
    0,
  );
  const orderedAnnotations = useMemo(
    () => [...stackedAnnotations].sort((a, b) => a.stack - b.stack),
    [stackedAnnotations],
  );

  return (
    <>
      {Array.from({ length: maxSequenceLength }, (_, baseIdx) => {
        return (
          <div
            className={classNames(
              "nsv:relative nsv:mt-4 nsv:flex nsv:flex-col nsv:justify-between",
            )}
            key={`base-${baseIdx}`}
          >
            {annotatedSequences.map(
              (sequence: AnnotatedBase[], sequenceIdx) => {
                const base = sequence.find(
                  (base: AnnotatedBase) => base.index === baseIdx,
                ) || { base: " ", annotations: [], index: baseIdx };

                // Check for misalignment with first sequence
                const firstSeqBase = annotatedSequences[0]?.find(
                  (b: AnnotatedBase) => b.index === baseIdx,
                );
                const isMisaligned =
                  highlightMisalignments &&
                  sequenceIdx > 0 &&
                  firstSeqBase &&
                  base.base !== " " &&
                  firstSeqBase.base !== " " &&
                  base.base !== "-" &&
                  firstSeqBase.base !== "-" &&
                  base.base !== firstSeqBase.base;

                return (
                  <div
                    key={`sequence-${sequenceIdx}-base-${baseIdx}`}
                    className={classNames(
                      "nsv:text-center nsv:whitespace-nowrap",
                    )}
                    onMouseEnter={() => {
                      setHoveredPosition(base.index);
                      // if mouse is down, update selection
                      if (mouseDown.current && selection) {
                        setSelection({
                          ...selection,
                          end: base.index,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredPosition(null)}
                    onMouseDown={() => {
                      mouseDown.current = true;
                      setSelection({
                        start: base.index,
                        end: base.index,
                        direction: "forward",
                      });
                    }}
                    onMouseUp={handleMouseUp}
                  >
                    <CharComponent
                      char={`| ${base.index}`}
                      index={baseIdx}
                      charClassName={classNames(
                        "nsv:absolute nsv:-top-4 nsv:left-0",
                        "nsv:[border-bottom-width:1px]",
                        indicesClassName({
                          base,
                          sequenceIdx,
                        }),
                      )}
                    />
                    <CharComponent
                      char={base.base}
                      index={baseIdx}
                      charClassName={classNames(
                        charClassName({
                          base,
                          sequenceIdx,
                        }),
                        isMisaligned && "nsv:text-sequences-mismatch!",
                        ["-", " "].includes(base.base) &&
                          "nsv:text-sequences-gap!",
                        baseInSelection({
                          baseIndex: baseIdx,
                          selection,
                          sequenceLength:
                            annotatedSequences[sequenceIdx].length,
                        }) &&
                          base.base !== " " &&
                          classNames(
                            "nsv-sequence-selection",
                            selectionClassName,
                          ),
                      )}
                    />
                  </div>
                );
              },
            )}
            <SequenceAnnotation
              annotations={orderedAnnotations}
              index={baseIdx}
              maxAnnotationStack={maxAnnotationStack + 1}
              setHoveredPosition={setHoveredPosition}
              setActiveAnnotation={setActiveAnnotation}
              maxSequenceLength={maxSequenceLength}
            />
          </div>
        );
      })}
    </>
  );
};

export const SeqMetadataBar = ({
  hoveredPosition,
  activeAnnotation,
  annotatedSequences,
  charClassName,
  seqIdxToCopy,
  setSeqIdxToCopy,
  selection,
  className,
  hideDownloadButton,
  alignmentEnabled,
  alignmentHasInput,
  alignmentCanUpdate,
  onAlign,
  alignState,
}: {
  hoveredPosition: number | null;
  activeAnnotation: Annotation | null;
  selection: AriadneSelection | null;
  annotatedSequences: AnnotatedBase[][];
  seqIdxToCopy: number;
  setSeqIdxToCopy: (idx: number) => void;
  charClassName: ({
    base,
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => string;
  className?: string;
  hideDownloadButton?: boolean;
  alignmentEnabled: boolean;
  alignmentHasInput: boolean;
  alignmentCanUpdate: boolean;
  onAlign: () => Promise<void>;
  alignState: AlignState;
}) => {
  const alignmentExplanationId = useId();
  const annotationDisplay = activeAnnotation ? (
    <span
      className={classNames(
        "nsv:flex nsv:gap-1 nsv:rounded-full nsv:px-2 nsv:py-px nsv:text-[0.75rem]/[1rem] nsv:opacity-100!",
        "nsv:ml-2 nsv:truncate",
        activeAnnotation.className,
      )}
    >
      <span className="nsv:flex nsv:gap-1">
        <p className="nsv:opacity-70">Label: </p>
        <p className="">{activeAnnotation.text}</p>
      </span>
      <span className="nsv:flex nsv:gap-1">
        <p className="nsv:opacity-70">Type: </p>
        <p className="">{activeAnnotation.type}</p>
      </span>
      <span className="nsv:flex nsv:gap-1">
        <p className="nsv:opacity-70">Direction: </p>
        <p className="">{activeAnnotation.direction}</p>
      </span>
      <span className="nsv:flex nsv:gap-1">
        <p className="nsv:opacity-70">from</p>
        <p className="">
          {activeAnnotation.start} - {activeAnnotation.end}
        </p>
      </span>
    </span>
  ) : null;
  const positionDisplay = (
    <span className="nsv:text-sequences-foreground nsv:min-w-16 nsv:text-[0.75rem]/[1rem]">
      Pos: {hoveredPosition ?? 0}
    </span>
  );
  return (
    <div
      className={classNames(
        "nsv:flex nsv:h-8 nsv:items-center nsv:gap-2 nsv:py-1 nsv:text-[0.75rem]/[1rem]",
        className,
      )}
    >
      {!hideDownloadButton && (
        <Button
          onClick={() => {
            downloadAsFasta({ annotatedSequences });
          }}
          size="xs"
          variant="ghost"
          className={classNames(
            "nsv:hover:bg-sequences-foreground/30 nsv:text-sequences-foreground",
            "nsv:[transition:color_150ms_ease,background-color_150ms_ease,border-color_150ms_ease,fill_150ms_ease,stroke_150ms_ease]",
          )}
        >
          <DownloadIcon className="nsv:size-3" />
        </Button>
      )}

      {alignmentEnabled && alignmentHasInput && (
        <>
          <Button
            onClick={() => void onAlign()}
            size="xs"
            disabled={!alignmentCanUpdate || alignState.status === "running"}
            aria-describedby={
              alignmentCanUpdate ? undefined : alignmentExplanationId
            }
            title={
              alignmentCanUpdate
                ? undefined
                : "Alignment needs setSequences to apply its result."
            }
            className={classNames(
              "nsv:bg-sequences-foreground/10 nsv:hover:bg-sequences-foreground/30 nsv:text-sequences-foreground",
              "nsv:disabled:cursor-not-allowed nsv:disabled:opacity-50",
              "nsv:[transition:color_150ms_ease,background-color_150ms_ease,border-color_150ms_ease,fill_150ms_ease,stroke_150ms_ease]",
            )}
          >
            {alignState.status === "error" ? "Retry alignment" : "Align"}
          </Button>
          {!alignmentCanUpdate && (
            <span
              id={alignmentExplanationId}
              className="nsv:text-sequences-foreground nsv:text-[0.75rem]/[1rem]"
            >
              Provide setSequences to apply an alignment.
            </span>
          )}
        </>
      )}
      {alignmentEnabled && alignState.status === "running" && (
        <span role="status" className="nsv:text-[0.75rem]/[1rem]">
          Aligning sequences…
        </span>
      )}
      {alignmentEnabled && alignState.status === "error" && (
        <span
          role="alert"
          className="nsv:ml-2 nsv:text-[0.75rem]/[1rem] nsv:text-red-500"
        >
          Alignment failed. Select Retry alignment to try again.
        </span>
      )}
      <CopyDisplay
        annotatedSequences={annotatedSequences}
        charClassName={charClassName}
        seqIdxToCopy={seqIdxToCopy}
        setSeqIdxToCopy={setSeqIdxToCopy}
        selection={selection}
      />
      {positionDisplay}
      {annotationDisplay}
    </div>
  );
};

export const SequenceAnnotation = ({
  annotations,
  maxAnnotationStack,
  index,
  setHoveredPosition,
  setActiveAnnotation,
  maxSequenceLength,
}: {
  annotations: StackedAnnotation[];
  maxAnnotationStack: number;
  setHoveredPosition: (position: number | null) => void;
  setActiveAnnotation: (annotation: StackedAnnotation | null) => void;
  maxSequenceLength: number;
  index: number;
}) => {
  return (
    <div
      className=" "
      key={`annotation-${index}`}
      onMouseEnter={() => setHoveredPosition(index)}
      onMouseLeave={() => setHoveredPosition(null)}
    >
      {[...Array(maxAnnotationStack).keys()].map((i) => {
        const annotation = annotations
          .filter((ann) =>
            baseInSelection({
              baseIndex: index,
              selection: ann,
              sequenceLength: maxSequenceLength,
            }),
          )
          .find((ann) => ann.stack === i);
        if (annotation) {
          if (
            !baseInSelection({
              baseIndex: index,
              selection: annotation,
              sequenceLength: maxSequenceLength,
            })
          ) {
            return (
              <div
                key={`annotation-${index}-${i}`}
                className={
                  "nsv:h-3 nsv:[border-bottom-width:2px] nsv:opacity-10"
                }
              />
            );
          }

          return (
            <div
              key={`annotation-${index}-${i}`}
              className={classNames(
                "nsv:group/annotation nsv:h-3 nsv:border-black nsv:group-hover/annotation:[border-width:1px]",
                annotation.className,
              )}
              onClick={() =>
                annotation.onClick?.({
                  start: annotation.start,
                  end: annotation.end,
                  diection: annotation.direction,
                })
              }
              onMouseEnter={() => setActiveAnnotation(annotation)}
              onMouseLeave={() => setActiveAnnotation(null)}
            ></div>
          );
        } else {
          return (
            <div key={`placeholder-${index}-${i}`} className={"nsv:h-3"} />
          );
        }
      })}
    </div>
  );
};

interface CharProps {
  char: string;
  index: number;
  charClassName: string;
}

export const CharComponent = ({ char, charClassName }: CharProps) => {
  // don't allow selection of chars
  const sharedClassName = "nsv:font-mono nsv:select-none";
  if (char === " ") {
    return (
      <div
        className={classNames(sharedClassName, charClassName, "nsv:opacity-20")}
      >
        .
      </div>
    );
  }
  return (
    <div className={classNames(sharedClassName, charClassName, "nsv:mr-px")}>
      {char}
    </div>
  );
};

export const CopyDisplay = ({
  seqIdxToCopy,
  setSeqIdxToCopy,
  annotatedSequences,
  charClassName,
  selection,
}: {
  seqIdxToCopy: number;
  setSeqIdxToCopy: (idx: number) => void;
  selection: AriadneSelection | null;
  annotatedSequences: AnnotatedBase[][];
  charClassName: ({
    base,
    sequenceIdx,
  }: {
    base: AnnotatedBase;
    sequenceIdx: number;
  }) => string;
  className?: string;
}) => {
  const safeSeqIdxToCopy = Math.max(
    0,
    Math.min(seqIdxToCopy, Math.max(annotatedSequences.length - 1, 0)),
  );
  const selectedSequence = annotatedSequences[safeSeqIdxToCopy];
  const hasSelectedSequence = Boolean(selectedSequence?.length);
  return (
    <span className="nsv:flex nsv:items-center nsv:gap-2 nsv:px-1 nsv:py-px">
      <Select
        value={safeSeqIdxToCopy.toString()}
        onValueChange={(value) => setSeqIdxToCopy(parseInt(value))}
        disabled={annotatedSequences.length === 0}
      >
        <SelectTrigger
          className={classNames(
            charClassName({
              base: { base: "A", annotations: [], index: 0 },
              sequenceIdx: safeSeqIdxToCopy,
            }),
            "nsv:text-sequences-foreground nsv:w-fit nsv:rounded-none nsv:[border-right-width:1px]",
          )}
        >
          <SelectValue>Sequence {safeSeqIdxToCopy + 1}</SelectValue>
        </SelectTrigger>
        <SelectContent className="nsv:text-sequences-foreground nsv:bg-sequences-background">
          {annotatedSequences.map((_, idx) => (
            <SelectItem
              key={`sequence-${idx}`}
              value={idx.toString()}
              className={charClassName({
                base: { base: "A", annotations: [], index: 0 },
                sequenceIdx: idx,
              })}
            >
              Sequence {idx + 1}{" "}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CopyButton
        textToCopy={() => {
          if (!selection) {
            return "";
          }
          return getStringToCopy(
            annotatedSequences,
            selection,
            safeSeqIdxToCopy,
          );
        }}
        label={""}
        disabled={!selection || !hasSelectedSequence}
        buttonClassName={charClassName({
          base: { base: "A", annotations: [], index: 0 },
          sequenceIdx: safeSeqIdxToCopy,
        })}
      />
    </span>
  );
};

const getStringToCopy = (
  annotatedSequences: AnnotatedBase[][],
  selection: AriadneSelection,
  seqIdxToCopy: number,
) => {
  const seq = annotatedSequences[seqIdxToCopy];
  if (!seq || seq.length === 0) {
    return "";
  }
  const stringToCopy = seq
    .filter((base) =>
      baseInSelection({
        baseIndex: base.index,
        selection: selection,
        sequenceLength: seq.length,
      }),
    )
    .map((base) => base.base)
    .join("");
  return stringToCopy;
};
