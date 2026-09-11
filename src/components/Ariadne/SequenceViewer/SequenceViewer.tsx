import {
  baseInSelection,
  downloadAsFasta,
  getAnnotatedSequence,
  stackAnnotationsNoOverlap,
} from "@Ariadne/utils";
import { classNames } from "@utils/stringUtils";
import { useMafftEinsi } from "../hooks/useMafftEinsi";

import { useEffect, useMemo, useRef, useState } from "react";
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
}) => {
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [seqIdxToCopy, setSeqIdxToCopy] = useState<number>(0);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(
    null,
  );
  const { state: alignState, run: runAlignment } = useMafftEinsi();
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
  const stackedAnnotations = useMemo(
    function memoize() {
      if (validation.hasUnsafeSequenceData) {
        return [];
      }
      return stackAnnotationsNoOverlap(
        validatedAnnotations,
        Math.max(...validatedSequences.map((seq) => seq.length)),
      );
    },
    [
      validatedAnnotations,
      validatedSequences,
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
  useEffect(
    function mountCopyHandler() {
      const copyHandler = (e: ClipboardEvent) => {
        if (!selection) {
          return;
        }
        const stringToCopy = getStringToCopy(
          annotatedSequences,
          selection,
          seqIdxToCopy,
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
    [annotatedSequences, selection, seqIdxToCopy],
  );

  const memoizedSeqContent = useMemo(() => {
    return (
      <SeqContent
        annotatedSequences={annotatedSequences}
        selection={selection}
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
    selection,
    stackedAnnotations,
    highlightMisalignments,
  ]);

  if (validation.hasUnsafeSequenceData) {
    return (
      <ViewerValidationMessages
        diagnostics={validation.diagnostics}
        sequenceUnavailable
      />
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
            seqIdxToCopy={seqIdxToCopy}
            setSeqIdxToCopy={setSeqIdxToCopy}
            selection={selection}
            hideDownloadButton={hideDownloadButton}
            onAlign={async () => {
              if (!setSequences) return;
              const fasta = validatedSequences
                .map((seq, idx) => `>Sequence_${idx + 1}\n${seq}`)
                .join("\n");

              await runAlignment(fasta);
            }}
            alignState={alignState}
            setSequences={setSequences}
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
  setActiveAnnotation: (annotation: Annotation | null) => void;
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
  const handleMouseUp = () => {
    mouseDown.current = false;
  };

  useEffect(function addMouseUpListener() {
    document.addEventListener("mouseup", () => {
      handleMouseUp();
    });
    return function removeMouseUpListener() {
      document.removeEventListener("mouseup", () => {
        handleMouseUp();
      });
    };
  }, []);

  const maxSequenceLength = Math.max(
    ...annotatedSequences.map((seq) => seq.length),
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
              annotations={stackedAnnotations}
              index={baseIdx}
              maxAnnotationStack={Math.max(
                1,
                Math.max(...stackedAnnotations.map((ann) => ann.stack)),
              )}
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
  onAlign,
  alignState,
  setSequences,
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
  onAlign: () => Promise<void>;
  alignState?: {
    status: "idle" | "running" | "done" | "error";
    output?: string;
    error?: unknown;
  };
  setSequences?: (sequences: string[]) => void;
}) => {
  useEffect(() => {
    if (alignState?.status === "done" && alignState.output && setSequences) {
      // Parse the aligned FASTA output
      const lines = alignState.output.split("\n");
      const alignedSequences: string[] = [];
      let currentSeq = "";

      for (const line of lines) {
        if (line.startsWith(">")) {
          if (currentSeq) {
            alignedSequences.push(currentSeq);
            currentSeq = "";
          }
        } else {
          currentSeq += line.trim();
        }
      }
      if (currentSeq) {
        alignedSequences.push(currentSeq);
      }

      if (alignedSequences.length > 0) {
        setSequences(alignedSequences.map((x) => x.toUpperCase()));
      }
    }
  }, [alignState, setSequences]);
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

      {setSequences && (
        <Button
          onClick={onAlign}
          size="xs"
          disabled={alignState?.status === "running"}
          className={classNames(
            "nsv:bg-sequences-foreground/10 nsv:hover:bg-sequences-foreground/30 nsv:text-sequences-foreground",
            "nsv:disabled:cursor-not-allowed nsv:disabled:opacity-50",
            "nsv:[transition:color_150ms_ease,background-color_150ms_ease,border-color_150ms_ease,fill_150ms_ease,stroke_150ms_ease]",
          )}
        >
          Align
        </Button>
      )}
      {alignState?.status === "error" && (
        <span className="nsv:ml-2 nsv:text-[0.75rem]/[1rem] nsv:text-red-500">
          Alignment failed
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
  setActiveAnnotation: (annotation: Annotation | null) => void;
  maxSequenceLength: number;
  index: number;
}) => {
  const orderedAnnotations = annotations.sort((a, b) => a.stack - b.stack);
  return (
    <div
      className=" "
      key={`annotation-${index}`}
      onMouseEnter={() => setHoveredPosition(index)}
      onMouseLeave={() => setHoveredPosition(null)}
    >
      {[...Array(maxAnnotationStack).keys()].map((i) => {
        const annotation = orderedAnnotations
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
  return (
    <span className="nsv:flex nsv:items-center nsv:gap-2 nsv:px-1 nsv:py-px">
      <Select
        value={seqIdxToCopy.toString()}
        onValueChange={(value) => setSeqIdxToCopy(parseInt(value))}
      >
        <SelectTrigger
          className={classNames(
            charClassName({
              base: { base: "A", annotations: [], index: 0 },
              sequenceIdx: seqIdxToCopy,
            }),
            "nsv:text-sequences-foreground nsv:w-fit nsv:rounded-none nsv:[border-right-width:1px]",
          )}
        >
          <SelectValue>Sequence {seqIdxToCopy + 1}</SelectValue>
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
          return getStringToCopy(annotatedSequences, selection, seqIdxToCopy);
        }}
        label={""}
        disabled={!selection}
        buttonClassName={charClassName({
          base: { base: "A", annotations: [], index: 0 },
          sequenceIdx: seqIdxToCopy,
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
  const stringToCopy = seq
    .filter((base) =>
      baseInSelection({
        baseIndex: base.index,
        selection: selection,
        sequenceLength: annotatedSequences[seqIdxToCopy].length,
      }),
    )
    .map((base) => base.base)
    .join("");
  return stringToCopy;
};
