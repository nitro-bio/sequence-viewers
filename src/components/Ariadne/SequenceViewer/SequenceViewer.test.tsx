import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { AnnotatedBase, AriadneSelection } from "../types";
import { ariadneSelectionSchema } from "../schemas";
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

const rowResidue = (
  container: HTMLElement,
  sequenceIdx: number,
  position: number,
) =>
  container.querySelectorAll(`[data-sequence-row="${sequenceIdx}"]`)[position];

const selectedText = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll(".nsv-sequence-selection"),
    (node) => node.textContent,
  ).join("");

const copySelection = () => {
  const setData = vi.fn();
  fireEvent.copy(document, { clipboardData: { setData } });
  return setData;
};

test("locks a drag to its starting sequence across rows and stops on release outside", () => {
  const setSelection = vi.fn();
  const { container } = render(
    <SequenceViewer sequences={["ACGT", "TGCA"]} setSelection={setSelection} />,
  );

  fireEvent.mouseDown(rowResidue(container, 1, 0));
  fireEvent.mouseEnter(rowResidue(container, 0, 2));
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 0,
    end: 2,
    direction: "forward",
    sequenceIdx: 1,
  });
  expect(selectedText(container)).toBe("TGC");
  expect(
    container.querySelector('[data-sequence-row="0"] .nsv-sequence-selection'),
  ).toBeNull();
  expect(copySelection()).toHaveBeenCalledWith("text/plain", "TGC");

  fireEvent.mouseUp(document);
  fireEvent.mouseEnter(rowResidue(container, 0, 3));
  expect(setSelection).toHaveBeenCalledTimes(2);
  fireEvent.mouseDown(rowResidue(container, 0, 1));
  expect(selectedText(container)).toBe("C");
  expect(copySelection()).toHaveBeenCalledWith("text/plain", "C");
});

test("backward drags select a text range and can cross back over the anchor", () => {
  const setSelection = vi.fn();
  const { container } = render(
    <SequenceViewer sequences={["ACGTA"]} setSelection={setSelection} />,
  );
  fireEvent.mouseDown(rowResidue(container, 0, 2));
  fireEvent.mouseEnter(rowResidue(container, 0, 1));
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 1,
    end: 2,
    direction: "reverse",
    sequenceIdx: 0,
  });
  expect(selectedText(container)).toBe("CG");
  expect(copySelection()).toHaveBeenCalledWith("text/plain", "CG");

  fireEvent.mouseEnter(rowResidue(container, 0, 4));
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 2,
    end: 4,
    direction: "forward",
    sequenceIdx: 0,
  });
  expect(selectedText(container)).toBe("GTA");
});

test("starts on gaps, ignores padding and right clicks, and clamps to the starting sequence", () => {
  const setSelection = vi.fn();
  const { container } = render(
    <SequenceViewer sequences={["ACGTA", "T-G"]} setSelection={setSelection} />,
  );
  fireEvent.mouseDown(rowResidue(container, 1, 4));
  fireEvent.mouseDown(rowResidue(container, 0, 0), { button: 2 });
  expect(setSelection).not.toHaveBeenCalled();

  fireEvent.mouseDown(rowResidue(container, 1, 1));
  expect(selectedText(container)).toBe("-");
  fireEvent.mouseEnter(rowResidue(container, 0, 4));
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 1,
    end: 2,
    direction: "forward",
    sequenceIdx: 1,
  });
  expect(selectedText(container)).toBe("-G");
  expect(copySelection()).toHaveBeenCalledWith("text/plain", "-G");

  fireEvent.blur(window);
  fireEvent.mouseEnter(rowResidue(container, 0, 0));
  expect(setSelection).toHaveBeenCalledTimes(2);
});

test("controlled selection scopes highlighting and both copy paths by optional sequence index", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  try {
    const props = {
      sequences: ["ACGT", "T-GA"],
      selectionClassName: "custom-selection",
    };
    const selection: AriadneSelection = {
      start: 1,
      end: 2,
      direction: "forward",
      sequenceIdx: 1,
    };
    const { container, rerender } = render(
      <SequenceViewer {...props} selection={selection} />,
    );
    expect(selectedText(container)).toBe("-G");
    expect(container.querySelectorAll(".custom-selection")).toHaveLength(2);
    expect(copySelection()).toHaveBeenCalledWith("text/plain", "-G");
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(writeText).toHaveBeenLastCalledWith("-G");

    rerender(
      <SequenceViewer
        {...props}
        selection={{ start: 1, end: 2, direction: "forward" }}
      />,
    );
    expect(container.querySelectorAll(".nsv-sequence-selection")).toHaveLength(
      4,
    );
    expect(copySelection()).toHaveBeenCalledWith(
      "text/plain",
      ">Sequence_1\nCG\n>Sequence_2\n-G\n",
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(writeText).toHaveBeenLastCalledWith(
      ">Sequence_1\nCG\n>Sequence_2\n-G\n",
    );

    rerender(
      <SequenceViewer
        {...props}
        selection={{ ...selection, start: 3, end: 0 }}
      />,
    );
    expect(selectedText(container)).toBe("TA");
    expect(copySelection()).toHaveBeenCalledWith("text/plain", "TA");
  } finally {
    vi.unstubAllGlobals();
  }
});

test("clamps controlled selections to their sequence and disables stale sequence selections", () => {
  const selection: AriadneSelection = {
    start: 1,
    end: 4,
    direction: "forward",
    sequenceIdx: 1,
  };
  const { container, rerender } = render(
    <SequenceViewer sequences={["ACGTA", "TG"]} selection={selection} />,
  );
  expect(selectedText(container)).toBe("G");
  expect(copySelection()).toHaveBeenCalledWith("text/plain", "G");

  rerender(<SequenceViewer sequences={["ACGTA", "T"]} selection={selection} />);
  expect(selectedText(container)).toBe("");
  expect(
    screen.getByRole("button", { name: "Copy to clipboard" }),
  ).toBeDisabled();
  rerender(<SequenceViewer sequences={["ACGTA"]} selection={selection} />);
  expect(selectedText(container)).toBe("");
  expect(copySelection()).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Copy to clipboard" }),
  ).toBeDisabled();
});

test("all-sequence copying keeps gaps and case, skips empty ranges, and wraps FASTA records", () => {
  render(
    <SequenceViewer
      sequences={["", "A", ` ${"c".repeat(61)}-G`, " T-  "]}
      selection={{ start: 1, end: 63, direction: "forward" }}
    />,
  );
  expect(copySelection()).toHaveBeenCalledWith(
    "text/plain",
    `>Sequence_3\n${"c".repeat(60)}\nc-G\n>Sequence_4\nT-\n`,
  );
  expect(
    screen.getByRole("button", { name: "Copy to clipboard" }),
  ).toBeEnabled();
});

test("selection schema preserves an optional nonnegative integer sequence index", () => {
  const selection = { start: 0, end: 1, direction: "forward" };
  expect(ariadneSelectionSchema.parse(selection)).toEqual(selection);
  expect(
    ariadneSelectionSchema.parse({ ...selection, sequenceIdx: 1 }),
  ).toEqual({ ...selection, sequenceIdx: 1 });
  for (const sequenceIdx of [-1, 0.5]) {
    expect(
      ariadneSelectionSchema.safeParse({ ...selection, sequenceIdx }).success,
    ).toBe(false);
  }
});

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
  expect(screen.queryByRole("combobox")).toBeNull();
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
    sequenceIdx: 0,
  });
  expect(onSelectionChange).toHaveBeenNthCalledWith(2, {
    start: 0,
    end: 2,
    direction: "forward",
    sequenceIdx: 0,
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
    sequenceIdx: 0,
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
