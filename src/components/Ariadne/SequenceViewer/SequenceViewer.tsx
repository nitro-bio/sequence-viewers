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
import { usePositionLabelLayout } from "./usePositionLabelLayout";
import { PositionLabelSlot, PositionRulerRow } from "./PositionRulerRow";
import {
  isMinimalPositionLabelRenderer,
  isCustomPositionLabelRenderer,
  type PositionLabelRenderer,
} from "./positionLabelRenderer";

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
  positionLabels,
  positionLabelRenderer,
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
  /**
   * Display labels for aligned columns, replacing the default index ruler.
   * Null or missing entries are blank; extra entries are ignored. Selection
   * and annotation coordinates remain zero-based column indices. Update labels
   * alongside sequences when alignment changes the columns.
   */
  positionLabels?: readonly (string | null)[];
  /** Minimal by default; a packaged renderer or a React component for each nonblank label. */
  positionLabelRenderer?: PositionLabelRenderer;
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
  const selectionSequenceLength =
    currentSelection?.sequenceIdx === undefined
      ? maxSequenceLength
      : (annotatedSequences[currentSelection.sequenceIdx]?.length ?? 0);
  const displayedSelection = useMemo(
    () =>
      selectionSequenceLength === 0
        ? null
        : clampSlice({
            slice: currentSelection,
            firstIdx: 0,
            lastIdx: selectionSequenceLength - 1,
          }),
    [currentSelection, selectionSequenceLength],
  );
  const hasSequenceData = annotatedSequences.some(
    (annotatedSequence) => annotatedSequence.length > 0,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const customPositionLabels = isCustomPositionLabelRenderer(
    positionLabelRenderer,
  );
  const labelHoveredPosition = customPositionLabels ? hoveredPosition : null;
  const rulerLabels = useMemo(
    () =>
      positionLabels ??
      (positionLabelRenderer === undefined
        ? undefined
        : Array.from({ length: maxSequenceLength }, (_, index) =>
            index % 10 === 0 ? String(index) : null,
          )),
    [maxSequenceLength, positionLabels, positionLabelRenderer],
  );
  usePositionLabelLayout(
    contentRef,
    rulerLabels,
    annotatedSequences,
    positionLabelRenderer,
  );

  useEffect(
    function resetStaleMetadata() {
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
    [activeAnnotation, hoveredPosition, maxSequenceLength, stackedAnnotations],
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
    [annotatedSequences, displayedSelection, hasSequenceData],
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
        positionLabels={rulerLabels}
        positionLabelRenderer={positionLabelRenderer}
        hoveredPosition={labelHoveredPosition}
      />
    );
  }, [
    annotatedSequences,
    charClassName,
    displayedSelection,
    highlightMisalignments,
    rulerLabels,
    positionLabelRenderer,
    labelHoveredPosition,
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
          selection={displayedSelection}
          hideDownloadButton={hideDownloadButton}
          alignmentEnabled={enableAlignment}
          alignmentHasInput={hasAlignmentInput}
          alignmentCanUpdate={Boolean(setSequences)}
          onAlign={runAlignment}
          alignState={alignState}
        />
      )}
      <div
        ref={contentRef}
        className={classNames(
          "nsv:flex nsv:w-full nsv:flex-wrap nsv:px-2",
          rulerLabels !== undefined && "nsv-position-content",
        )}
        data-position-label-preset={
          rulerLabels === undefined
            ? undefined
            : isMinimalPositionLabelRenderer(positionLabelRenderer)
              ? "minimal"
              : "adaptive"
        }
        data-position-label-custom={customPositionLabels ? "true" : undefined}
      >
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
  positionLabels,
  positionLabelRenderer,
  hoveredPosition,
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
  positionLabels?: readonly (string | null)[];
  positionLabelRenderer?: PositionLabelRenderer;
  hoveredPosition?: number | null;
}) => {
  const VIRTUAL_CELL_THRESHOLD = 5_000;
  const dragAnchor = useRef<{ index: number; sequenceIdx: number } | null>(
    null,
  );
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
    dragAnchor.current = null;
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
      window.addEventListener("blur", handleMouseUp);
      return function removeMouseUpListener() {
        document.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("blur", handleMouseUp);
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
    const findScrollElement = () => {
      let ancestor = root.parentElement;
      while (ancestor) {
        if (
          ["auto", "scroll"].includes(getComputedStyle(ancestor).overflowY) &&
          ancestor.scrollHeight > ancestor.clientHeight
        ) {
          return ancestor;
        }
        ancestor = ancestor.parentElement;
      }
      return null;
    };
    const measure = () => {
      const nearest = findScrollElement();
      setScrollElement((current) => (current === nearest ? current : nearest));
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
    observer.observe(glyph);
    let ancestor = root.parentElement;
    while (ancestor) {
      observer.observe(ancestor);
      ancestor = ancestor.parentElement;
    }
    return () => observer.disconnect();
  }, [useVirtualRows]);

  const estimateLineSize = useCallback(
    (lineIndex: number) => {
      const lineInBlock = lineIndex % Math.max(linesPerBlock, 1);
      if (lineInBlock < annotatedSequences.length) {
        return (
          virtualMetrics.residueHeight +
          (lineInBlock === 0
            ? 16 +
              (positionLabels !== undefined &&
              !isMinimalPositionLabelRenderer(positionLabelRenderer)
                ? 26
                : 0)
            : 0)
        );
      }
      return 12;
    },
    [
      annotatedSequences.length,
      linesPerBlock,
      virtualMetrics.residueHeight,
      positionLabels,
      positionLabelRenderer,
    ],
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
    virtualizer.measure();
    // Rebuild the estimates before measuring DOM rows. Otherwise an unchanged
    // height can compare equal to the old measurement and never reenter the
    // cleared cache, leaving the next layout to use the estimate instead.
    virtualizer.getTotalSize();
    // Resetting estimates drops cached heights even for rulers already mounted.
    // Restore their measurements now; ResizeObserver need not fire again when
    // those rows did not change size (for example after changing renderers).
    virtualRootRef.current
      ?.querySelectorAll<HTMLDivElement>("[data-position-ruler-line]")
      .forEach((line) => virtualizer.measureElement(line));
  }, [estimateLineSize, useVirtualRows, virtualizer]);

  useIsomorphicLayoutEffect(() => {
    if (!useVirtualRows) return;
    const previousColumns = previousColumnsRef.current;
    if (previousColumns !== undefined && previousColumns !== columnsPerRow) {
      const root = virtualRootRef.current;
      if (!scrollElement && root) {
        const rootRect = root.getBoundingClientRect();
        if (rootRect.bottom <= 0 || rootRect.top >= window.innerHeight) {
          previousColumnsRef.current = columnsPerRow;
          return;
        }
      }
      const previousLine = visibleLineRef.current;
      const coordinate =
        Math.floor(previousLine / linesPerBlock) * previousColumns;
      const lineInBlock = previousLine % linesPerBlock;
      const nextLine =
        Math.floor(coordinate / columnsPerRow) * linesPerBlock + lineInBlock;
      virtualizer.scrollToIndex(nextLine, { align: "start" });
    }
    previousColumnsRef.current = columnsPerRow;
  }, [
    columnsPerRow,
    linesPerBlock,
    scrollElement,
    useVirtualRows,
    virtualizer,
  ]);

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
          const anchor = dragAnchor.current;
          if (anchor) {
            const lastIndex =
              annotatedSequences[anchor.sequenceIdx]?.length - 1;
            if (!(lastIndex >= 0)) return;
            const end = Math.min(base.index, lastIndex);
            setSelection({
              start: Math.min(anchor.index, end),
              end: Math.max(anchor.index, end),
              direction: end < anchor.index ? "reverse" : "forward",
              sequenceIdx: anchor.sequenceIdx,
            });
          }
        }}
        onMouseLeave={() => setHoveredPosition(null)}
        onMouseDown={(event) => {
          if (event.button !== 0 || base.base === " ") return;
          event.preventDefault();
          dragAnchor.current = { index: base.index, sequenceIdx };
          setSelection({
            start: base.index,
            end: base.index,
            direction: "forward",
            sequenceIdx,
          });
        }}
        onMouseUp={handleMouseUp}
      >
        {positionLabels === undefined &&
          (virtualWidth === undefined || sequenceIdx === 0) && (
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
            (selection?.sequenceIdx === undefined ||
              selection.sequenceIdx === sequenceIdx) &&
              baseInSelection({
                baseIndex: baseIdx,
                selection,
                sequenceLength: annotatedSequences[sequenceIdx].length,
              }) &&
              base.base !== " " &&
              classNames("nsv-sequence-selection", selectionClassName),
          )}
          glyphClassName={classNames(
            isMisaligned && "nsv:text-sequences-mismatch!",
            ["-", " "].includes(base.base) && "nsv:text-sequences-gap!",
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
      data-sequence-column={baseIdx}
    >
      {positionLabels !== undefined && (
        <PositionLabelSlot
          label={positionLabels[baseIdx]}
          columnIndex={baseIdx}
          renderer={positionLabelRenderer}
          isHovered={hoveredPosition === baseIdx}
          isSelected={baseInSelection({
            baseIndex: baseIdx,
            selection,
            sequenceLength: maxSequenceLength,
          })}
        />
      )}
      {annotatedSequences.map((_, sequenceIdx) =>
        renderResidue(baseIdx, sequenceIdx),
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
          const hasRuler =
            isSequenceLine && sequenceIdx === 0 && positionLabels !== undefined;
          return (
            <div
              key={virtualItem.key}
              ref={hasRuler ? virtualizer.measureElement : undefined}
              className={classNames(
                "nsv:absolute nsv:left-0 nsv:flex nsv:w-full",
                hasRuler && "nsv:flex-col",
              )}
              style={{
                top: 0,
                height: hasRuler ? undefined : virtualItem.size,
                paddingTop: isSequenceLine && sequenceIdx === 0 ? 16 : 0,
                transform: `translateY(${virtualItem.start - scrollMargin}px)`,
              }}
              data-index={virtualItem.index}
              data-position-ruler-line={hasRuler ? "true" : undefined}
              data-virtual-row={blockIndex}
              data-virtual-line={virtualItem.index}
              data-line-kind={isSequenceLine ? "sequence" : "annotation"}
              data-sequence-index={isSequenceLine ? sequenceIdx : undefined}
            >
              {hasRuler ? (
                <>
                  <PositionRulerRow
                    labels={positionLabels}
                    renderer={positionLabelRenderer}
                    first={first}
                    last={last}
                    columnWidth={virtualMetrics.columnWidth}
                    sequences={annotatedSequences}
                    selection={selection}
                    hoveredPosition={hoveredPosition}
                    sequenceLength={maxSequenceLength}
                  />
                  <div className="nsv:flex">
                    {Array.from({ length: last - first }, (_, offset) =>
                      renderResidue(
                        first + offset,
                        sequenceIdx,
                        virtualMetrics.columnWidth,
                      ),
                    )}
                  </div>
                </>
              ) : (
                Array.from({ length: last - first }, (_, offset) => {
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
                })
              )}
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
  glyphClassName?: string;
}

export const CharComponent = ({
  char,
  charClassName,
  glyphClassName,
}: CharProps) => {
  // don't allow selection of chars
  const sharedClassName = "nsv:font-mono nsv:select-none";
  if (char === " ") {
    return (
      <div
        className={classNames(sharedClassName, charClassName, "nsv:opacity-20")}
      >
        <span className={glyphClassName}>.</span>
      </div>
    );
  }
  return (
    <div className={classNames(sharedClassName, charClassName, "nsv:mr-px")}>
      {/* Keep the selection background in the sequence color even for gaps/mismatches. */}
      {glyphClassName ? <span className={glyphClassName}>{char}</span> : char}
    </div>
  );
};

export const CopyDisplay = ({
  annotatedSequences,
  charClassName,
  selection,
}: {
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
  const sequenceIdx = selection?.sequenceIdx ?? 0;
  const selectedSequence = annotatedSequences[sequenceIdx];
  const styleBase = selectedSequence?.[0];
  const hasCopyableSelection = Boolean(
    selection &&
      annotatedSequences.some(
        (sequence, index) =>
          (selection.sequenceIdx === undefined ||
            selection.sequenceIdx === index) &&
          sequence.length > 0 &&
          (selection.start > selection.end ||
            selection.start < sequence.length),
      ),
  );
  return (
    <span className="nsv:flex nsv:items-center nsv:gap-2 nsv:px-1 nsv:py-px">
      <CopyButton
        textToCopy={() =>
          selection ? getStringToCopy(annotatedSequences, selection) : ""
        }
        label={""}
        disabled={!hasCopyableSelection}
        buttonClassName={
          styleBase
            ? charClassName({ base: styleBase, sequenceIdx })
            : undefined
        }
      />
    </span>
  );
};

const getStringToCopy = (
  annotatedSequences: AnnotatedBase[][],
  selection: AriadneSelection,
) => {
  const selectedText = (seq: AnnotatedBase[]) =>
    seq
      .filter(
        (base) =>
          base.base !== " " &&
          baseInSelection({
            baseIndex: base.index,
            selection: selection,
            sequenceLength: seq.length,
          }),
      )
      .map((base) => base.base)
      .join("");
  if (selection.sequenceIdx !== undefined) {
    return selectedText(annotatedSequences[selection.sequenceIdx] ?? []);
  }
  return annotatedSequences
    .map((sequence, index) => {
      const text = selectedText(sequence);
      if (!text) return "";
      const wrapped = text.match(/.{1,60}/g)?.join("\n");
      return `>Sequence_${index + 1}\n${wrapped}\n`;
    })
    .join("");
};
