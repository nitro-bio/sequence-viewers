import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { AnnotatedBase } from "../types";
import { SeqContent, SequenceViewer } from "./SequenceViewer";

const alignmentMock = vi.hoisted(() => ({
  onAligned: undefined as ((sequences: string[]) => void) | undefined,
  run: vi.fn(async () => {}),
}));

vi.mock("../hooks/useMafftEinsi", () => ({
  useMafftEinsi: vi.fn(
    ({ onAligned }: { onAligned?: (sequences: string[]) => void }) => {
      alignmentMock.onAligned = onAligned;
      return { state: { status: "idle" }, run: alignmentMock.run };
    },
  ),
}));

const residue = (base: string) => screen.getByText(base).parentElement!;

test("renders with useful defaults", () => {
  const { container } = render(<SequenceViewer sequences={["AG", "CT"]} />);

  for (const base of ["A", "C"]) {
    expect(screen.getByText(base).className).toContain(
      "nsv:text-sequences-primary",
    );
  }
  expect(
    screen.getByRole("button", { name: "Download sequences as FASTA" }),
  ).not.toBeNull();
  expect(
    screen.getByRole("combobox", { name: "Sequence to copy" }),
  ).not.toBeNull();
  expect(container.querySelectorAll(".nsv-sequence-selection")).toHaveLength(0);
});

test("keeps and extends selection when uncontrolled", () => {
  const onSelectionChange = vi.fn();
  const { container } = render(
    <SequenceViewer
      sequences={["ACGT"]}
      setSelection={onSelectionChange}
      hideMetadataBar
    />,
  );

  fireEvent.mouseDown(residue("A"));
  fireEvent.mouseEnter(residue("G"));

  expect(onSelectionChange).toHaveBeenNthCalledWith(1, {
    start: 0,
    end: 0,
    direction: "forward",
  });
  expect(onSelectionChange).toHaveBeenNthCalledWith(2, {
    start: 0,
    end: 2,
    direction: "forward",
  });
  expect(
    Array.from(container.querySelectorAll(".nsv-sequence-selection")).map(
      (node) => node.textContent,
    ),
  ).toEqual(["A", "C", "G"]);
});

test("treats an explicit null selection as controlled", () => {
  const setSelection = vi.fn();
  const { container } = render(
    <SequenceViewer
      sequences={["ACGT"]}
      selection={null}
      setSelection={setSelection}
      hideMetadataBar
    />,
  );

  fireEvent.mouseDown(residue("C"));

  expect(setSelection).toHaveBeenCalledWith({
    start: 1,
    end: 1,
    direction: "forward",
  });
  expect(container.querySelectorAll(".nsv-sequence-selection")).toHaveLength(0);
});

test("clears an uncontrolled selection after applying an alignment", () => {
  const setSequences = vi.fn();
  const setSelection = vi.fn();
  const { container } = render(
    <SequenceViewer
      sequences={["ACGT"]}
      setSequences={setSequences}
      setSelection={setSelection}
      enableAlignment
      hideMetadataBar
    />,
  );
  fireEvent.mouseDown(residue("C"));
  expect(container.querySelectorAll(".nsv-sequence-selection")).toHaveLength(1);

  act(() => alignmentMock.onAligned?.(["A-CGT"]));

  expect(setSequences).toHaveBeenCalledWith(["A-CGT"]);
  expect(setSelection).toHaveBeenLastCalledWith(null);
  expect(container.querySelectorAll(".nsv-sequence-selection")).toHaveLength(0);
});

test("leaves controlled selection clearing to the alignment consumer", () => {
  const setSequences = vi.fn();
  const setSelection = vi.fn();
  const selection = { start: 1, end: 1, direction: "forward" as const };
  const { container } = render(
    <SequenceViewer
      sequences={["ACGT"]}
      setSequences={setSequences}
      selection={selection}
      setSelection={setSelection}
      enableAlignment
      hideMetadataBar
    />,
  );

  act(() => alignmentMock.onAligned?.(["A-CGT"]));

  expect(setSequences).toHaveBeenCalledWith(["A-CGT"]);
  expect(setSelection).not.toHaveBeenCalled();
  expect(container.querySelectorAll(".nsv-sequence-selection")).toHaveLength(1);
});

test("passes the complete annotation with a correctly spelled direction", () => {
  const onClick = vi.fn();
  const { container } = render(
    <SequenceViewer
      sequences={["ACGT"]}
      annotations={[
        {
          type: "CDS",
          start: 1,
          end: 2,
          direction: "reverse",
          text: "reverse feature",
          className: "annotation-target",
          onClick,
        },
      ]}
      hideMetadataBar
    />,
  );

  fireEvent.click(container.querySelector(".annotation-target")!);

  expect(onClick).toHaveBeenCalledWith({
    type: "CDS",
    start: 1,
    end: 2,
    direction: "reverse",
    text: "reverse feature",
    className: "annotation-target",
    onClick,
  });
  expect(onClick.mock.calls[0][0]).not.toHaveProperty("diection");
});

test("uses real sequence bases when deriving metadata styles", () => {
  const charClassName = vi.fn(
    ({ sequenceIdx }: { base: AnnotatedBase; sequenceIdx: number }) =>
      `custom-row-${sequenceIdx}`,
  );

  render(
    <SequenceViewer sequences={["C", "T"]} charClassName={charClassName} />,
  );

  expect(screen.getByText("C").className).toContain("custom-row-0");
  expect(screen.getByText("T").className).toContain("custom-row-1");
  expect(charClassName).toHaveBeenCalled();
  for (const [{ base, sequenceIdx }] of charClassName.mock.calls) {
    expect(base.base).toBe(["C", "T"][sequenceIdx]);
  }
});

test("SeqContent keeps the first base when indices are duplicated", () => {
  render(
    <SeqContent
      annotatedSequences={[
        [
          { base: "A", index: 0, annotations: [] },
          { base: "T", index: 0, annotations: [] },
        ],
      ]}
      selection={null}
      setSelection={() => {}}
      setHoveredPosition={() => {}}
      setActiveAnnotation={() => {}}
      stackedAnnotations={[]}
      charClassName={() => ""}
    />,
  );

  expect(screen.getByText("A")).not.toBeNull();
  expect(screen.queryByText("T")).toBeNull();
});

test("virtualizes large wrapped sequences and updates the window on scroll", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalScrollY = globalThis.scrollY;
  const scrollToMock = vi
    .spyOn(globalThis, "scrollTo")
    .mockImplementation(() => {});
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  const sequence = "A".repeat(6_000);
  const { container } = render(
    <SequenceViewer sequences={[sequence]} hideMetadataBar />,
  );
  const virtualRoot = container.querySelector<HTMLElement>(
    '[data-virtualized="true"]',
  )!;
  Object.defineProperty(virtualRoot, "clientWidth", { value: 800 });
  let scrollY = 0;
  Object.defineProperty(globalThis, "scrollY", {
    configurable: true,
    get: () => scrollY,
  });
  vi.spyOn(virtualRoot, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        x: 0,
        y: -scrollY,
        top: -scrollY,
        left: 0,
        right: 800,
        bottom: 4_000 - scrollY,
        width: 800,
        height: 4_000,
        toJSON: () => ({}),
      }) as DOMRect,
  );

  act(() => window.dispatchEvent(new Event("scroll")));
  const initialPositions = Array.from(
    container.querySelectorAll<HTMLElement>("[data-sequence-position]"),
    (element) => Number(element.dataset.sequencePosition),
  );
  expect(initialPositions.length).toBeLessThan(1_000);
  expect(initialPositions).toContain(0);

  scrollY = 2_000;
  act(() => window.dispatchEvent(new Event("scroll")));
  const scrolledPositions = Array.from(
    container.querySelectorAll<HTMLElement>("[data-sequence-position]"),
    (element) => Number(element.dataset.sequencePosition),
  );
  expect(Math.max(...scrolledPositions)).toBeGreaterThan(
    Math.max(...initialPositions),
  );
  expect(scrolledPositions).toContain(0);
  expect(scrolledPositions.length).toBeLessThan(1_000);
  globalThis.ResizeObserver = originalResizeObserver;
  scrollToMock.mockRestore();
  Object.defineProperty(globalThis, "scrollY", {
    configurable: true,
    value: originalScrollY,
  });
});

test("keeps offscreen selection logical until its virtual row is shown", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const scrollToMock = vi
    .spyOn(globalThis, "scrollTo")
    .mockImplementation(() => {});
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  const sequence = "A".repeat(6_000);
  const { container } = render(
    <SequenceViewer
      sequences={[sequence]}
      selection={{ start: 5_000, end: 5_010, direction: "forward" }}
      hideMetadataBar
    />,
  );
  expect(container.querySelectorAll(".nsv-sequence-selection")).toHaveLength(0);
  globalThis.ResizeObserver = originalResizeObserver;
  scrollToMock.mockRestore();
});

test("mounts and clamps a virtualized active descendant", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  const setSelection = vi.fn();
  const { rerender } = render(
    <SequenceViewer
      sequences={["A".repeat(100_000)]}
      setSelection={setSelection}
      hideMetadataBar
    />,
  );
  let surface = screen.getByRole("listbox");
  fireEvent.keyDown(surface, { key: "End" });
  fireEvent.keyDown(surface, { key: " " });
  expect(
    document.getElementById(surface.getAttribute("aria-activedescendant")!),
  ).not.toBeNull();

  rerender(
    <SequenceViewer
      sequences={["A".repeat(6_000)]}
      setSelection={setSelection}
      hideMetadataBar
    />,
  );
  surface = screen.getByRole("listbox");
  expect(
    document
      .getElementById(surface.getAttribute("aria-activedescendant")!)
      ?.getAttribute("aria-label"),
  ).toBe("Sequence 1, position 5999, A");
  fireEvent.keyDown(surface, { key: "ArrowLeft", shiftKey: true });
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 5_998,
    end: 5_999,
    direction: "reverse",
  });
  globalThis.ResizeObserver = originalResizeObserver;
});

test("does not expose padding cells as selected residues", () => {
  render(
    <SequenceViewer
      sequences={["AG", "A"]}
      selection={{ start: 1, end: 1, direction: "forward" }}
      hideMetadataBar
    />,
  );
  expect(
    screen
      .getByRole("option", { name: "Sequence 2, position 1, no residue" })
      .getAttribute("aria-selected"),
  ).toBe("false");
});

test("exposes one keyboard entry point and local residue semantics", () => {
  const { container } = render(
    <SequenceViewer sequences={["AG", "A-"]} hideMetadataBar />,
  );
  const surface = screen.getByRole("listbox", {
    name: "Sequence residues, 2 sequences by 2 positions",
  });
  expect(surface.tabIndex).toBe(0);
  expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  expect(
    screen.getByRole("option", { name: "Sequence 2, position 1, gap" }),
  ).not.toBeNull();
  expect(surface.getAttribute("aria-activedescendant")).toBe(
    screen.getByRole("option", { name: "Sequence 1, position 0, A" }).id,
  );
});

test("describes highlighted mismatches without relying on color", () => {
  render(
    <SequenceViewer
      sequences={["A", "T"]}
      highlightMisalignments
      hideMetadataBar
    />,
  );
  expect(
    screen.getByRole("option", {
      name: "Sequence 2, position 0, T, mismatch with A in sequence 1",
    }),
  ).not.toBeNull();
});

test("moves focus and creates forward and reverse keyboard ranges", () => {
  const setSelection = vi.fn();
  render(
    <SequenceViewer
      sequences={["ACGT"]}
      setSelection={setSelection}
      hideMetadataBar
    />,
  );
  const surface = screen.getByRole("listbox");
  fireEvent.keyDown(surface, { key: " " });
  fireEvent.keyDown(surface, { key: "ArrowRight", shiftKey: true });
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 0,
    end: 1,
    direction: "forward",
  });
  fireEvent.keyDown(surface, { key: "End" });
  fireEvent.keyDown(surface, { key: " " });
  fireEvent.keyDown(surface, { key: "ArrowLeft", shiftKey: true });
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 2,
    end: 3,
    direction: "reverse",
  });
  fireEvent.keyDown(surface, { key: "Escape" });
  expect(setSelection).toHaveBeenLastCalledWith(null);
});

test("starts a Shift range at focus after ordinary navigation", () => {
  const setSelection = vi.fn();
  render(
    <SequenceViewer
      sequences={["ACGT"]}
      selection={{ start: 0, end: 0, direction: "forward" }}
      setSelection={setSelection}
      hideMetadataBar
    />,
  );
  const surface = screen.getByRole("listbox");
  fireEvent.keyDown(surface, { key: "ArrowRight" });
  fireEvent.keyDown(surface, { key: "ArrowRight" });
  fireEvent.keyDown(surface, { key: "ArrowRight", shiftKey: true });
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 2,
    end: 3,
    direction: "forward",
  });
});

test("skips empty rows and keeps the active descendant mounted", () => {
  render(<SequenceViewer sequences={["AC", "", "T"]} hideMetadataBar />);
  const surface = screen.getByRole("listbox");
  fireEvent.keyDown(surface, { key: "ArrowDown" });
  expect(
    document.getElementById(surface.getAttribute("aria-activedescendant")!),
  ).toBe(screen.getByRole("option", { name: "Sequence 3, position 0, T" }));
});

test("cycles overlapping annotation descriptions and activates the current one", () => {
  const firstClick = vi.fn();
  const secondClick = vi.fn();
  render(
    <SequenceViewer
      sequences={["AC"]}
      annotations={[
        {
          type: "CDS",
          text: "first",
          start: 0,
          end: 1,
          direction: "forward",
          onClick: firstClick,
        },
        {
          type: "promoter",
          text: "second",
          start: 0,
          end: 0,
          direction: "reverse",
          onClick: secondClick,
        },
      ]}
      hideMetadataBar
    />,
  );
  const surface = screen.getByRole("listbox");
  fireEvent.keyDown(surface, { key: "a" });
  expect(screen.getByRole("status").textContent).toContain(
    "CDS annotation, first",
  );
  fireEvent.keyDown(surface, { key: "a" });
  expect(screen.getByRole("status").textContent).toContain(
    "promoter annotation, second",
  );
  fireEvent.keyDown(surface, { key: "A", shiftKey: true });
  expect(firstClick).not.toHaveBeenCalled();
  expect(secondClick).toHaveBeenCalledTimes(1);
});

test("clears an announced annotation when annotations are replaced", () => {
  const annotation = {
    type: "CDS",
    text: "temporary",
    start: 0,
    end: 0,
    direction: "forward" as const,
  };
  const { rerender } = render(
    <SequenceViewer
      sequences={["A"]}
      annotations={[annotation]}
      hideMetadataBar
    />,
  );
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "a" });
  expect(screen.getByRole("status").textContent).toContain("temporary");
  rerender(
    <SequenceViewer sequences={["A"]} annotations={[]} hideMetadataBar />,
  );
  expect(screen.getByRole("status").textContent).toBe("No residues selected.");
});

test("scopes keyboard copy handling to the active viewer", () => {
  render(
    <>
      <SequenceViewer sequences={["AA"]} hideMetadataBar />
      <SequenceViewer sequences={["CG"]} hideMetadataBar />
    </>,
  );
  const [first, second] = screen.getAllByRole("listbox");
  fireEvent.keyDown(first, { key: " " });
  fireEvent.keyDown(second, { key: " " });
  const firstClipboard = { setData: vi.fn() };
  const secondClipboard = { setData: vi.fn() };
  fireEvent.copy(first, { clipboardData: firstClipboard });
  fireEvent.copy(second, { clipboardData: secondClipboard });
  expect(firstClipboard.setData).toHaveBeenCalledWith("text/plain", "A");
  expect(secondClipboard.setData).toHaveBeenCalledWith("text/plain", "C");
});

test.each([
  [{ start: 2, end: 2, direction: "forward" as const }, "1 positions"],
  [{ start: 1, end: 3, direction: "forward" as const }, "3 positions"],
  [{ start: 3, end: 1, direction: "forward" as const }, "3 positions"],
])("announces inclusive selection counts for %o", (selection, count) => {
  render(
    <SequenceViewer
      sequences={["ACGT"]}
      selection={selection}
      hideMetadataBar
    />,
  );
  expect(screen.getByRole("status").textContent).toContain(count);
});
