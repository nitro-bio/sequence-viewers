import { useCallback, useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AriadneSelection } from "../types";

export const getResidueId = (
  instanceId: string,
  sequenceIdx: number,
  baseIdx: number,
) => `${instanceId}-residue-${sequenceIdx}-${baseIdx}`;

const selectionAt = (position: number): AriadneSelection => ({
  start: position,
  end: position,
  direction: "forward",
});

export const useSequenceKeyboardNavigation = ({
  rowLengths,
  setSelection,
  ensurePositionVisible,
  onAnnotationCommand,
  onActivePositionChange,
}: {
  rowLengths: number[];
  setSelection: (selection: AriadneSelection | null) => void;
  ensurePositionVisible?: (active: {
    sequenceIdx: number;
    position: number;
  }) => void;
  onAnnotationCommand?: (position: number, activate: boolean) => void;
  onActivePositionChange?: () => void;
}) => {
  const reactId = useId();
  const instanceId = `nsv-${reactId.replace(/:/g, "")}`;
  const [activeRow, setActiveRow] = useState(0);
  const [activePosition, setActivePosition] = useState(0);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const lastRow = Math.max(rowLengths.length - 1, 0);
  const firstNonEmptyRow = Math.max(
    rowLengths.findIndex((length) => length > 0),
    0,
  );
  const safeActiveRow = rowLengths[activeRow] ? activeRow : firstNonEmptyRow;
  const activeRowLength = rowLengths[safeActiveRow] ?? 0;
  const safeActivePosition = Math.max(
    0,
    Math.min(activePosition, Math.max(activeRowLength - 1, 0)),
  );

  useEffect(() => {
    if (activeRow !== safeActiveRow) setActiveRow(safeActiveRow);
  }, [activeRow, safeActiveRow]);
  useEffect(() => {
    if (activePosition !== safeActivePosition) {
      setActivePosition(safeActivePosition);
    }
  }, [activePosition, safeActivePosition]);

  const moveFocus = useCallback(
    (row: number, position: number) => {
      const rowDirection = row < safeActiveRow ? -1 : 1;
      let nextRow = Math.max(0, Math.min(row, lastRow));
      while (nextRow >= 0 && nextRow <= lastRow && !rowLengths[nextRow]) {
        nextRow += rowDirection;
      }
      if (nextRow < 0 || nextRow > lastRow) return;
      const nextLength = rowLengths[nextRow] ?? 0;
      if (nextLength === 0) return;
      const nextPosition = Math.max(0, Math.min(position, nextLength - 1));
      ensurePositionVisible?.({ sequenceIdx: nextRow, position: nextPosition });
      onActivePositionChange?.();
      setActiveRow(nextRow);
      setActivePosition(nextPosition);
      requestAnimationFrame(() => {
        document
          .getElementById(getResidueId(instanceId, nextRow, nextPosition))
          ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      });
      return nextPosition;
    },
    [
      ensurePositionVisible,
      instanceId,
      lastRow,
      onActivePositionChange,
      rowLengths,
      safeActiveRow,
    ],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      let nextRow = safeActiveRow;
      let nextPosition = safeActivePosition;
      switch (event.key) {
        case "ArrowLeft":
          nextPosition -= 1;
          break;
        case "ArrowRight":
          nextPosition += 1;
          break;
        case "ArrowUp":
          nextRow -= 1;
          break;
        case "ArrowDown":
          nextRow += 1;
          break;
        case "Home":
          nextPosition = 0;
          break;
        case "End":
          nextPosition = Math.max((rowLengths[safeActiveRow] ?? 1) - 1, 0);
          break;
        case " ":
        case "Enter":
          event.preventDefault();
          setSelection(selectionAt(safeActivePosition));
          setSelectionAnchor(safeActivePosition);
          return;
        case "Escape":
          event.preventDefault();
          setSelection(null);
          setSelectionAnchor(null);
          return;
        case "a":
        case "A":
          if (!event.altKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            onAnnotationCommand?.(safeActivePosition, event.shiftKey);
          }
          return;
        default:
          return;
      }
      event.preventDefault();
      const movedPosition = moveFocus(nextRow, nextPosition);
      if (movedPosition === undefined) return;
      if (event.shiftKey) {
        const anchor = Math.min(
          selectionAnchor ?? safeActivePosition,
          Math.max((rowLengths[safeActiveRow] ?? 1) - 1, 0),
        );
        setSelectionAnchor(anchor);
        setSelection({
          start: Math.min(anchor, movedPosition),
          end: Math.max(anchor, movedPosition),
          direction: movedPosition < anchor ? "reverse" : "forward",
        });
      } else {
        setSelectionAnchor(null);
      }
    },
    [
      moveFocus,
      onAnnotationCommand,
      rowLengths,
      safeActivePosition,
      safeActiveRow,
      selectionAnchor,
      setSelection,
    ],
  );

  const activateResidue = useCallback(
    (sequenceIdx: number, position: number) => {
      setActiveRow(sequenceIdx);
      setActivePosition(position);
      setSelectionAnchor(position);
      onActivePositionChange?.();
    },
    [onActivePositionChange],
  );

  return {
    activePosition: safeActivePosition,
    activeRow: safeActiveRow,
    activeDescendantId: getResidueId(
      instanceId,
      safeActiveRow,
      safeActivePosition,
    ),
    instanceId,
    onKeyDown,
    activateResidue,
  };
};
