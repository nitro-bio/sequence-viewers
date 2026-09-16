import { useMemo, useRef } from "react";
import { baseInSelection } from "@Ariadne/utils";
import type { AnnotatedBase, AriadneSelection } from "../types";
import type { PositionLabelProps } from "./PositionLabel";
import {
  resolvePositionLabelRenderer,
  isMinimalPositionLabelRenderer,
  isCustomPositionLabelRenderer,
  type PositionLabelRenderer,
} from "./positionLabelRenderer";
import { usePositionLabelLayout } from "./usePositionLabelLayout";

export function PositionLabelSlot({
  label,
  renderer,
  ...context
}: Omit<PositionLabelProps, "label"> & {
  label: string | null | undefined;
  renderer?: PositionLabelRenderer;
}) {
  const PositionLabel = resolvePositionLabelRenderer(renderer);
  return (
    <div className="nsv-position-slot">
      {label != null && label !== "" && (
        <>
          <span className="nsv-position-label">
            <PositionLabel label={label} {...context} />
          </span>
          {!isMinimalPositionLabelRenderer(renderer) && (
            <span className="nsv-position-tick" aria-hidden="true" />
          )}
        </>
      )}
    </div>
  );
}

/** A separately measured ruler for a mounted virtual coordinate block. */
export function PositionRulerRow({
  labels,
  renderer,
  first,
  last,
  columnWidth,
  sequences,
  selection,
  hoveredPosition,
  sequenceLength,
}: {
  labels: readonly (string | null)[];
  renderer?: PositionLabelRenderer;
  first: number;
  last: number;
  columnWidth: number;
  sequences: AnnotatedBase[][];
  selection: AriadneSelection | null;
  hoveredPosition?: number | null;
  sequenceLength: number;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const visibleLabels = useMemo(
    () => labels.slice(first, last),
    [labels, first, last],
  );
  usePositionLabelLayout(contentRef, visibleLabels, sequences, renderer);
  return (
    <div
      ref={contentRef}
      className="nsv-position-content nsv:flex"
      data-position-label-preset={
        isMinimalPositionLabelRenderer(renderer) ? "minimal" : "adaptive"
      }
      data-position-label-custom={
        isCustomPositionLabelRenderer(renderer) ? "true" : undefined
      }
    >
      {Array.from({ length: last - first }, (_, offset) => {
        const columnIndex = first + offset;
        return (
          <div
            key={columnIndex}
            className="nsv:relative"
            style={{ flex: `0 0 ${columnWidth}px` }}
            data-sequence-column={columnIndex}
          >
            <PositionLabelSlot
              label={labels[columnIndex]}
              renderer={renderer}
              columnIndex={columnIndex}
              isHovered={hoveredPosition === columnIndex}
              isSelected={baseInSelection({
                baseIndex: columnIndex,
                selection,
                sequenceLength,
              })}
            />
          </div>
        );
      })}
    </div>
  );
}
