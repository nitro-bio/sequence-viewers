import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { SequenceViewer } from "@nitro-bio/sequence-viewers";
import "@nitro-bio/sequence-viewers/styles.css";

const parameters = new URLSearchParams(window.location.search);
const length = Number(parameters.get("length") ?? 1000);
const rows = Number(parameters.get("rows") ?? 1);
const sequence = "ATGACCTG".repeat(Math.ceil(length / 8)).slice(0, length);
const sequences = Array.from({ length: rows }, () => sequence);
const nextPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
const started = performance.now();

function Workload() {
  useLayoutEffect(() => {
    void (async () => {
      await nextPaint();
      const mountMs = performance.now() - started;
      const cells = document.querySelectorAll(
        '.nsv-sequence-root div[class*="nsv:text-center"]',
      );
      const interactionStart = performance.now();
      cells[0]?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await nextPaint();
      const result = {
        rows,
        length,
        cells: rows * length,
        mountMs,
        selectionMs: performance.now() - interactionStart,
        selectedCells: document.querySelectorAll(".nsv-sequence-selection")
          .length,
        domElements: document.querySelectorAll("*").length,
      };
      document.getElementById("result")!.textContent = JSON.stringify(result);
    })();
  }, []);
  return <SequenceViewer sequences={sequences} highlightMisalignments />;
}

createRoot(document.getElementById("root")!).render(<Workload />);
