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
  highlightMisalignments,
}: {
  sequences: string[];
  setSequences?: (sequences: string[]) => void;
  annotations: Annotation[];
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
  noValidate?: boolean;
  highlightMisalignments?: boolean;
}) => {
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [seqIdxToCopy, setSeqIdxToCopy] = useState<number>(0);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(
    null,
  );
  const { state: alignState, run: runAlignment } = useMafftEinsi();
  const stackedAnnotations = useMemo(
    function memoize() {
      return stackAnnotationsNoOverlap(
        annotations,
        Math.max(...sequences.map((seq) => seq.length)),
      );
    },
    [annotations],
  );
  const annotatedSequences = useMemo(
    function memoize() {
      return sequences.map((sequence) =>
        getAnnotatedSequence({ sequence, stackedAnnotations, noValidate }),
      );
    },
    [sequences, stackedAnnotations],
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
  return (
    <>
      <div
        className={classNames(
          "relative isolate flex flex-wrap",
          containerClassName,
        )}
      >
        {!hideMetadataBar && (
          <SeqMetadataBar
            hoveredPosition={hoveredPosition}
            activeAnnotation={activeAnnotation}
            className="sticky inset-x-0 top-0 z-3 w-full px-2 py-1 backdrop-blur-md"
            annotatedSequences={annotatedSequences}
            charClassName={charClassName}
            seqIdxToCopy={seqIdxToCopy}
            setSeqIdxToCopy={setSeqIdxToCopy}
            selection={selection}
            hideDownloadButton={hideDownloadButton}
            onAlign={async () => {
              if (!setSequences) return;
              const fasta = sequences
                .map((seq, idx) => `>Sequence_${idx + 1}\n${seq}`)
                .join("\n");

              await runAlignment(fasta);
            }}
            alignState={alignState}
            setSequences={setSequences}
          />
        )}
        <div className="flex flex-wrap px-2">{memoizedSeqContent}</div>
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
      return "opacity-0";
    }
    return classNames(
      "text-xs z-1",
      baseInSelection({
        baseIndex: base.index,
        selection,
        sequenceLength: annotatedSequences[sequenceIdx].length,
      })
        ? "text-sequences-primary group-hover:text-sequences-primary-muted"
        : "text-sequences-foreground group-hover:text-sequences-primary",
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
              "relative mt-4 flex flex-col justify-between",
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
                    className={classNames("text-center whitespace-nowrap")}
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
                        "absolute -top-4 left-0",
                        "border-b",
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
                        isMisaligned && "!text-sequences-mismatch",
                        ["-", " "].includes(base.base) && "!text-sequences-gap",
                        baseInSelection({
                          baseIndex: baseIdx,
                          selection,
                          sequenceLength:
                            annotatedSequences[sequenceIdx].length,
                        }) &&
                          base.base !== " " &&
                          classNames(
                            "bg-sequences-selection/20",
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
        "flex gap-1 rounded-full px-2 py-px text-xs opacity-100!",
        "ml-2 truncate",
        activeAnnotation.className,
      )}
    >
      <span className="flex gap-1">
        <p className="opacity-70">Label: </p>
        <p className="">{activeAnnotation.text}</p>
      </span>
      <span className="flex gap-1">
        <p className="opacity-70">Type: </p>
        <p className="">{activeAnnotation.type}</p>
      </span>
      <span className="flex gap-1">
        <p className="opacity-70">Direction: </p>
        <p className="">{activeAnnotation.direction}</p>
      </span>
      <span className="flex gap-1">
        <p className="opacity-70">from</p>
        <p className="">
          {activeAnnotation.start} - {activeAnnotation.end}
        </p>
      </span>
    </span>
  ) : null;
  const positionDisplay = (
    <span className="text-sequences-foreground min-w-16 text-xs">
      Pos: {hoveredPosition ?? 0}
    </span>
  );
  return (
    <div
      className={classNames(
        "flex h-8 items-center gap-2 py-1 text-xs",
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
            "hover:bg-sequences-foreground/30 text-sequences-foreground",
            "transition-colors",
          )}
        >
          <DownloadIcon className="size-3" />
        </Button>
      )}

      {setSequences && (
        <Button
          onClick={onAlign}
          size="xs"
          disabled={alignState?.status === "running"}
          className={classNames(
            "bg-sequences-foreground/10 hover:bg-sequences-foreground/30 text-sequences-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
          )}
        >
          Align
        </Button>
      )}
      {alignState?.status === "error" && (
        <span className="ml-2 text-xs text-red-500">Alignment failed</span>
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
                className={"h-3 border-b-2 opacity-10"}
              />
            );
          }

          return (
            <div
              key={`annotation-${index}-${i}`}
              className={classNames(
                "group/annotation h-3 border-black group-hover/annotation:border",
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
          return <div key={`placeholder-${index}-${i}`} className={"h-3"} />;
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
  const sharedClassName = "font-mono select-none";
  if (char === " ") {
    return (
      <div className={classNames(sharedClassName, charClassName, "opacity-20")}>
        .
      </div>
    );
  }
  return (
    <div className={classNames(sharedClassName, charClassName, "mr-px")}>
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
    <span className="flex items-center gap-2 px-1 py-px">
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
            "text-sequences-foreground w-fit rounded-none border-r",
          )}
        >
          <SelectValue>Sequence {seqIdxToCopy + 1}</SelectValue>
        </SelectTrigger>
        <SelectContent className="text-sequences-foreground bg-sequences-background">
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
