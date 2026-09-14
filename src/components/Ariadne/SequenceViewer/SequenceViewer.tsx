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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import type {
  AnnotatedBase,
  Annotation,
  AriadneSelection,
  StackedAnnotation,
} from "../types";

const useIsomorphicLayoutEffect =
  typeof document === "undefined" ? useEffect : useLayoutEffect;

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

type CharClassName = ({
  base,
  sequenceIdx,
}: {
  base: AnnotatedBase;
  sequenceIdx: number;
}) => string;

const defaultCharClassName: CharClassName = () => "nsv:text-sequences-primary";

const toAnnotationCallbackPayload = ({
  type,
  direction,
  start,
  end,
  className,
  text,
  onClick,
}: StackedAnnotation): Annotation => ({
  type,
  direction,
  start,
  end,
  className,
  text,
  onClick,
});

export const SequenceViewer = ({
  sequences,
  setSequences,
  annotations,
  selection,
  setSelection,
  containerClassName,
  charClassName = defaultCharClassName,
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
  selection?: AriadneSelection | null;
  setSelection?: (selection: AriadneSelection | null) => void;
  containerClassName?: string;
  charClassName?: CharClassName;
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
  const [internalSelection, setInternalSelection] =
    useState<AriadneSelection | null>(null);
  const isSelectionControlled = selection !== undefined;
  const currentSelection = isSelectionControlled
    ? selection
    : internalSelection;
  const updateSelection = useCallback(
    (nextSelection: AriadneSelection | null) => {
      if (!isSelectionControlled) {
        setInternalSelection(nextSelection);
      }
      setSelection?.(nextSelection);
    },
    [isSelectionControlled, setSelection],
  );
  const applyAlignedSequences = useCallback(
    (alignedSequences: string[]) => {
      setSequences?.(alignedSequences);
      if (!isSelectionControlled) {
        updateSelection(null);
      }
    },
    [isSelectionControlled, setSequences, updateSelection],
  );
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
    onAligned: setSequences ? applyAlignedSequences : undefined,
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
            slice: currentSelection,
            firstIdx: 0,
            lastIdx: maxSequenceLength - 1,
          }),
    [currentSelection, maxSequenceLength],
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
        setSelection={updateSelection}
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
    stackedAnnotations,
    updateSelection,
  ]);

  if (validation.hasUnsafeSequenceData) {
    return (
      <div
        className={classNames("nsv-root nsv-sequence-root", containerClassName)}
      >
        <ViewerValidationMessages
          diagnostics={validation.diagnostics}
          sequenceUnavailable
        />
      </div>
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
    <div
      className={classNames("nsv-root nsv-sequence-root", containerClassName)}
    >
      <ViewerValidationMessages diagnostics={validation.diagnostics} />
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
      <div className="nsv:flex nsv:w-full nsv:flex-wrap nsv:px-2">
        {memoizedSeqContent}
      </div>
    </div>
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
  const VIRTUAL_CELL_THRESHOLD = 5_000;
  const mouseDown = useRef(false);
  const virtualRootRef = useRef<HTMLDivElement>(null);
  const measuringGlyphRef = useRef<HTMLSpanElement>(null);
  const [virtualMetrics, setVirtualMetrics] = useState({
    columnWidth: 10,
    containerWidth: 800,
    residueHeight: 24,
  });
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const previousColumnsRef = useRef<number>();
  const visibleLineRef = useRef(0);
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
  const basesBySequenceAndIndex = useMemo(
    () =>
      annotatedSequences.map((sequence) => {
        const basesByIndex = new Map<number, AnnotatedBase>();
        sequence.forEach((base) => {
          if (!basesByIndex.has(base.index)) {
            basesByIndex.set(base.index, base);
          }
        });
        return basesByIndex;
      }),
    [annotatedSequences],
  );

  const useVirtualRows =
    maxSequenceLength * Math.max(annotatedSequences.length, 1) >
    VIRTUAL_CELL_THRESHOLD;
  const columnsPerRow = Math.max(
    1,
    Math.floor(virtualMetrics.containerWidth / virtualMetrics.columnWidth),
  );
  const coordinateBlockCount = Math.ceil(maxSequenceLength / columnsPerRow);
  const annotationLineCount = maxAnnotationStack + 1;
  const linesPerBlock = annotatedSequences.length + annotationLineCount;
  const virtualLineCount = coordinateBlockCount * linesPerBlock;

  useIsomorphicLayoutEffect(() => {
    if (!useVirtualRows) return;
    const root = virtualRootRef.current;
    const glyph = measuringGlyphRef.current;
    if (!root || !glyph) return;
    let ancestor = root.parentElement;
    let nearest: HTMLElement | null = null;
    while (ancestor) {
      if (
        ["auto", "scroll"].includes(getComputedStyle(ancestor).overflowY) &&
        ancestor.scrollHeight > ancestor.clientHeight
      ) {
        nearest = ancestor;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    setScrollElement(nearest);
    const measure = () => {
      const glyphRect = glyph.getBoundingClientRect();
      setVirtualMetrics((current) => {
        const next = {
          columnWidth: Math.max(1, (glyphRect.width || 9) + 1),
          containerWidth: Math.max(1, root.clientWidth),
          residueHeight: Math.max(1, glyphRect.height || 24),
        };
        return current.columnWidth === next.columnWidth &&
          current.containerWidth === next.containerWidth &&
          current.residueHeight === next.residueHeight
          ? current
          : next;
      });
      const rootRect = root.getBoundingClientRect();
      const margin = nearest
        ? rootRect.top - nearest.getBoundingClientRect().top + nearest.scrollTop
        : rootRect.top + window.scrollY;
      setScrollMargin((current) => (current === margin ? current : margin));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [useVirtualRows]);

  const estimateLineSize = useCallback(
    (lineIndex: number) => {
      const lineInBlock = lineIndex % Math.max(linesPerBlock, 1);
      if (lineInBlock < annotatedSequences.length) {
        return virtualMetrics.residueHeight + (lineInBlock === 0 ? 16 : 0);
      }
      return 12;
    },
    [annotatedSequences.length, linesPerBlock, virtualMetrics.residueHeight],
  );
  const elementVirtualizer = useVirtualizer({
    count: virtualLineCount,
    getScrollElement: () => scrollElement,
    estimateSize: estimateLineSize,
    overscan: 3,
    scrollMargin,
    enabled: useVirtualRows && Boolean(scrollElement),
    initialRect: { width: 800, height: 240 },
    useFlushSync: false,
  });
  const windowVirtualizer = useWindowVirtualizer({
    count: virtualLineCount,
    estimateSize: estimateLineSize,
    overscan: 3,
    scrollMargin,
    enabled: useVirtualRows && !scrollElement,
    initialRect: { width: 800, height: 240 },
    useFlushSync: false,
  });
  const virtualizer = scrollElement ? elementVirtualizer : windowVirtualizer;
  const virtualItems = virtualizer.getVirtualItems();
  const firstVirtualLine = virtualItems[0]?.index;
  const lastVirtualLine = virtualItems[virtualItems.length - 1]?.index;

  useIsomorphicLayoutEffect(() => {
    if (!useVirtualRows) return;
    const previousColumns = previousColumnsRef.current;
    if (previousColumns !== undefined && previousColumns !== columnsPerRow) {
      const previousLine = visibleLineRef.current;
      const coordinate =
        Math.floor(previousLine / linesPerBlock) * previousColumns;
      const lineInBlock = previousLine % linesPerBlock;
      const nextLine =
        Math.floor(coordinate / columnsPerRow) * linesPerBlock + lineInBlock;
      virtualizer.scrollToIndex(nextLine, { align: "start" });
    }
    previousColumnsRef.current = columnsPerRow;
  }, [columnsPerRow, linesPerBlock, useVirtualRows, virtualizer]);

  useEffect(() => {
    const firstVisibleLine = virtualizer.range?.startIndex;
    if (firstVisibleLine !== undefined)
      visibleLineRef.current = firstVisibleLine;
  }, [virtualizer, virtualizer.range?.startIndex]);

  useEffect(() => {
    if (!useVirtualRows) return;
    setHoveredPosition(null);
    setActiveAnnotation(null);
  }, [
    setActiveAnnotation,
    setHoveredPosition,
    useVirtualRows,
    firstVirtualLine,
    lastVirtualLine,
  ]);

  const renderResidue = (
    baseIdx: number,
    sequenceIdx: number,
    virtualWidth?: number,
  ) => {
    const base = basesBySequenceAndIndex[sequenceIdx].get(baseIdx) || {
      base: " ",
      annotations: [],
      index: baseIdx,
    };
    const firstSeqBase = basesBySequenceAndIndex[0]?.get(baseIdx);
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
          virtualWidth !== undefined && "nsv:relative",
        )}
        style={
          virtualWidth === undefined
            ? undefined
            : { flex: `0 0 ${virtualWidth}px` }
        }
        data-sequence-position={
          virtualWidth === undefined ? undefined : baseIdx
        }
        data-sequence-row={sequenceIdx}
        onMouseEnter={() => {
          setHoveredPosition(base.index);
          if (mouseDown.current && selection) {
            setSelection({ ...selection, end: base.index });
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
        {(virtualWidth === undefined || sequenceIdx === 0) && (
          <CharComponent
            char={`| ${base.index}`}
            index={baseIdx}
            charClassName={classNames(
              "nsv:absolute nsv:-top-4 nsv:left-0",
              "nsv:[border-bottom-width:1px]",
              indicesClassName({ base, sequenceIdx }),
            )}
          />
        )}
        <CharComponent
          char={base.base}
          index={baseIdx}
          charClassName={classNames(
            charClassName({ base, sequenceIdx }),
            isMisaligned && "nsv:text-sequences-mismatch!",
            ["-", " "].includes(base.base) && "nsv:text-sequences-gap!",
            baseInSelection({
              baseIndex: baseIdx,
              selection,
              sequenceLength: annotatedSequences[sequenceIdx].length,
            }) &&
              base.base !== " " &&
              classNames("nsv-sequence-selection", selectionClassName),
          )}
        />
      </div>
    );
  };

  const renderSmallColumn = (baseIdx: number) => (
    <div
      className="nsv:relative nsv:mt-4 nsv:flex nsv:flex-col nsv:justify-between"
      key={`base-${baseIdx}`}
      data-sequence-position={baseIdx}
    >
      <div style={{ display: "contents" }}>
        {annotatedSequences.map((_, sequenceIdx) =>
          renderResidue(baseIdx, sequenceIdx),
        )}
      </div>
      <div style={{ display: "contents" }}>
        <SequenceAnnotation
          annotations={orderedAnnotations}
          index={baseIdx}
          maxAnnotationStack={maxAnnotationStack + 1}
          setHoveredPosition={setHoveredPosition}
          setActiveAnnotation={setActiveAnnotation}
          maxSequenceLength={maxSequenceLength}
        />
      </div>
    </div>
  );

  if (useVirtualRows) {
    return (
      <div
        ref={virtualRootRef}
        className="nsv:relative nsv:w-full"
        style={{
          height: virtualizer.getTotalSize(),
          overflowAnchor: "none",
        }}
        data-virtualized="true"
        data-columns-per-row={columnsPerRow}
        data-lines-per-block={linesPerBlock}
        data-coordinate-block-count={coordinateBlockCount}
      >
        <span
          ref={measuringGlyphRef}
          aria-hidden="true"
          className="nsv:absolute nsv:invisible nsv:w-max nsv:font-mono"
        >
          M
        </span>
        {virtualItems.map((virtualItem) => {
          const blockIndex = Math.floor(virtualItem.index / linesPerBlock);
          const lineInBlock = virtualItem.index % linesPerBlock;
          const first = blockIndex * columnsPerRow;
          const last = Math.min(maxSequenceLength, first + columnsPerRow);
          const isSequenceLine = lineInBlock < annotatedSequences.length;
          const sequenceIdx = lineInBlock;
          const annotationStack = lineInBlock - annotatedSequences.length;
          return (
            <div
              key={virtualItem.key}
              className="nsv:absolute nsv:left-0 nsv:flex nsv:w-full"
              style={{
                top: 0,
                height: virtualItem.size,
                paddingTop: isSequenceLine && sequenceIdx === 0 ? 16 : 0,
                transform: `translateY(${virtualItem.start - scrollMargin}px)`,
              }}
              data-index={virtualItem.index}
              data-virtual-row={blockIndex}
              data-virtual-line={virtualItem.index}
              data-line-kind={isSequenceLine ? "sequence" : "annotation"}
              data-sequence-index={isSequenceLine ? sequenceIdx : undefined}
            >
              {Array.from({ length: last - first }, (_, offset) => {
                const baseIdx = first + offset;
                if (!isSequenceLine) {
                  return (
                    <SequenceAnnotationLine
                      key={`annotation-${annotationStack}-${baseIdx}`}
                      annotations={orderedAnnotations}
                      index={baseIdx}
                      stack={annotationStack}
                      setHoveredPosition={setHoveredPosition}
                      setActiveAnnotation={setActiveAnnotation}
                      maxSequenceLength={maxSequenceLength}
                      width={virtualMetrics.columnWidth}
                    />
                  );
                }
                return renderResidue(
                  baseIdx,
                  sequenceIdx,
                  virtualMetrics.columnWidth,
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: maxSequenceLength }, (_, baseIdx) =>
        renderSmallColumn(baseIdx),
      )}
    </>
  );
};

const SequenceAnnotationLine = ({
  annotations,
  index,
  stack,
  setHoveredPosition,
  setActiveAnnotation,
  maxSequenceLength,
  width,
}: {
  annotations: StackedAnnotation[];
  index: number;
  stack: number;
  setHoveredPosition: (position: number | null) => void;
  setActiveAnnotation: (annotation: StackedAnnotation | null) => void;
  maxSequenceLength: number;
  width: number;
}) => {
  const annotation = annotations.find(
    (candidate) =>
      candidate.stack === stack &&
      baseInSelection({
        baseIndex: index,
        selection: candidate,
        sequenceLength: maxSequenceLength,
      }),
  );
  return (
    <div
      style={{ flex: `0 0 ${width}px`, height: 12 }}
      data-sequence-position={index}
      onMouseEnter={() => {
        setHoveredPosition(index);
        setActiveAnnotation(annotation ?? null);
      }}
      onMouseLeave={() => {
        setHoveredPosition(null);
        setActiveAnnotation(null);
      }}
      className={classNames(
        "nsv:group/annotation nsv:border-black",
        annotation?.className,
      )}
      onClick={() =>
        annotation?.onClick?.(toAnnotationCallbackPayload(annotation))
      }
    />
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
  const alignmentError = alignState.status === "error" ? alignState : undefined;
  const alignmentNeedsInputChange = alignmentError?.reason === "input";
  const alignmentConfigurationChanged =
    alignmentError?.reason === "configuration";
  const alignmentInitializationFailed =
    alignmentError?.reason === "initialization";
  const alignmentNeedsRemount =
    alignmentConfigurationChanged || alignmentInitializationFailed;
  const alignmentCannotRun = alignmentNeedsInputChange || alignmentNeedsRemount;
  const alignmentErrorMessage = alignmentNeedsInputChange
    ? "Alignment input cannot contain FASTA headers or line breaks. Update the sequences before aligning."
    : alignmentConfigurationChanged
      ? "Alignment configuration changed after initialization. Remount SequenceViewer to apply the new configuration."
      : alignmentInitializationFailed
        ? "Alignment worker could not initialize. Check alignment asset access, then remount SequenceViewer to try again."
        : "Alignment failed. Select Retry alignment to try again.";
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
          aria-label="Download sequences as FASTA"
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
            disabled={
              !alignmentCanUpdate ||
              alignState.status === "running" ||
              alignmentCannotRun
            }
            aria-describedby={
              !alignmentCanUpdate || alignmentCannotRun
                ? alignmentExplanationId
                : undefined
            }
            title={
              !alignmentCanUpdate
                ? "Alignment needs setSequences to apply its result."
                : alignmentCannotRun
                  ? alignmentErrorMessage
                  : undefined
            }
            className={classNames(
              "nsv:bg-sequences-foreground/10 nsv:hover:bg-sequences-foreground/30 nsv:text-sequences-foreground",
              "nsv:disabled:cursor-not-allowed nsv:disabled:opacity-50",
              "nsv:[transition:color_150ms_ease,background-color_150ms_ease,border-color_150ms_ease,fill_150ms_ease,stroke_150ms_ease]",
            )}
          >
            {alignmentError?.recovery === "retry" ? "Retry alignment" : "Align"}
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
          id={
            alignmentCanUpdate && alignmentCannotRun
              ? alignmentExplanationId
              : undefined
          }
          role="alert"
          className="nsv:ml-2 nsv:text-[0.75rem]/[1rem] nsv:text-red-500"
        >
          {alignmentErrorMessage}
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
                annotation.onClick?.(toAnnotationCallbackPayload(annotation))
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
  const getStyleBase = (sequenceIdx: number): AnnotatedBase =>
    annotatedSequences[sequenceIdx]?.[0] ?? {
      base: " ",
      annotations: [],
      index: 0,
    };
  return (
    <span className="nsv:flex nsv:items-center nsv:gap-2 nsv:px-1 nsv:py-px">
      <Select
        value={safeSeqIdxToCopy.toString()}
        onValueChange={(value) => setSeqIdxToCopy(parseInt(value))}
        disabled={annotatedSequences.length === 0}
      >
        <SelectTrigger
          aria-label="Sequence to copy"
          className={classNames(
            charClassName({
              base: getStyleBase(safeSeqIdxToCopy),
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
                base: getStyleBase(idx),
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
          base: getStyleBase(safeSeqIdxToCopy),
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
