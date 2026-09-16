import { useEffect, type RefObject } from "react";
import type { AnnotatedBase } from "../types";
import {
  isMinimalPositionLabelRenderer,
  type PositionLabelRenderer,
} from "./positionLabelRenderer";

/** Keep labels within wrapped lines, rotating dense rulers without widening residues. */
export function usePositionLabelLayout(
  contentRef: RefObject<HTMLDivElement>,
  labels: readonly (string | null)[] | undefined,
  sequences: AnnotatedBase[][],
  renderer?: PositionLabelRenderer,
) {
  useEffect(() => {
    const content = contentRef.current;
    if (!content || labels === undefined) return;
    // Each mounted virtual row measures its own ruler and reports its height
    // to the virtualizer. The outer wrapper must not lay out those rows again.
    if (content.querySelector("[data-virtualized]")) return;
    const minimal = isMinimalPositionLabelRenderer(renderer);

    const layout = () => {
      const columns = Array.from(
        content.querySelectorAll<HTMLElement>("[data-sequence-column]"),
      );
      const lines = new Map<number, typeof columns>();
      for (const column of columns) {
        const top = column.offsetTop;
        const line = lines.get(top) ?? [];
        line.push(column);
        lines.set(top, line);
      }

      let vertical = false;
      let longestLabel = 0;
      let tallestLabel = 0;
      const offsets: [HTMLElement, number, number][] = [];
      for (const line of lines.values()) {
        const first = line[0].getBoundingClientRect();
        const last = line[line.length - 1].getBoundingClientRect();
        let previousRight = -Infinity;
        for (const column of line) {
          const label = column.querySelector<HTMLElement>(
            ".nsv-position-label",
          );
          if (!label) continue;
          const rect = column.getBoundingClientRect();
          // offsetWidth is the unrotated text width in both display modes.
          const width = label.offsetWidth;
          longestLabel = Math.max(longestLabel, width);
          tallestLabel = Math.max(tallestLabel, label.offsetHeight);
          const center = rect.left + rect.width / 2;
          const preferredLeft = minimal
            ? rect.left + width <= last.right
              ? rect.left
              : rect.left - width - 2
            : center - width / 2;
          const left = Math.max(
            first.left,
            Math.min(preferredLeft, last.right - width),
          );
          if (left < previousRight + 4 || width > last.right - first.left) {
            vertical = true;
          }
          previousRight = left + width;
          offsets.push([label, left + width / 2 - center, rect.left - left]);
        }
      }

      if (minimal) vertical = false;

      content.dataset.positionLabelLayout = vertical
        ? "vertical"
        : "horizontal";
      content.style.setProperty(
        "--nsv-position-height",
        `${minimal ? Math.max(0, tallestLabel - 16) : vertical ? longestLabel + 16 : Math.max(26, tallestLabel + 12)}px`,
      );
      for (const [label, offset, anchorOffset] of offsets) {
        label.style.setProperty(
          "--nsv-position-offset",
          `${vertical ? 0 : offset}px`,
        );
        // The minimal tick stays on its residue even when edge text shifts inward.
        label.style.setProperty(
          "--nsv-position-anchor-offset",
          `${anchorOffset}px`,
        );
      }
    };

    layout();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(layout);
    observer?.observe(content);
    // Custom components can change size through their own state, independently
    // of SequenceViewer props (for example, loading an icon or changing a badge).
    content
      .querySelectorAll(".nsv-position-label")
      .forEach((label) => observer?.observe(label));
    // A custom residue font can change column widths after its initial load.
    const fonts = content.ownerDocument.fonts;
    fonts?.addEventListener("loadingdone", layout);
    return () => {
      observer?.disconnect();
      fonts?.removeEventListener("loadingdone", layout);
      delete content.dataset.positionLabelLayout;
      content.style.removeProperty("--nsv-position-height");
    };
  }, [contentRef, labels, sequences, renderer]);
}
