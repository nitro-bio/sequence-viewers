import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CircularViewer } from "./CircularViewer";
import { LinearViewer } from "./LinearViewer";
import {
  CopyDisplay,
  SeqContent,
  SequenceAnnotation,
  SequenceViewer,
} from "./SequenceViewer/SequenceViewer";
import { useLinearSelectionRect } from "./hooks/useSelection";
import type {
  AnnotatedBase,
  Annotation,
  AriadneSelection,
  StackedAnnotation,
} from "./types";
import { EMPTY_ANNOTATIONS, normalizeAnnotations } from "./viewerUtils";
import { ViewerValidationError } from "./validation";

const utilitySpies = vi.hoisted(() => ({
  getAnnotatedSequence: vi.fn(),
  stackAnnotationsNoOverlap: vi.fn(),
}));

vi.mock("@Ariadne/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return {
    ...actual,
    getAnnotatedSequence: (
      ...args: Parameters<typeof actual.getAnnotatedSequence>
    ) => {
      utilitySpies.getAnnotatedSequence(...args);
      return actual.getAnnotatedSequence(...args);
    },
    stackAnnotationsNoOverlap: (
      ...args: Parameters<typeof actual.stackAnnotationsNoOverlap>
    ) => {
      utilitySpies.stackAnnotationsNoOverlap(...args);
      return actual.stackAnnotationsNoOverlap(...args);
    },
  };
});

const selection: AriadneSelection = {
  start: 0,
  end: 2,
  direction: "forward",
};

const annotation: Annotation = {
  type: "feature",
  direction: "forward",
  start: 0,
  end: 1,
  text: "feature",
};

const viewerCallbacks = () => ({
  selection: null,
  setSelection: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("stable rendering inputs", () => {
  test("normalizes omitted and fresh empty annotations to one value", () => {
    expect(normalizeAnnotations()).toBe(EMPTY_ANNOTATIONS);
    expect(normalizeAnnotations([])).toBe(EMPTY_ANNOTATIONS);
    expect(normalizeAnnotations([])).toBe(normalizeAnnotations([]));
  });

  test("does not restack a fresh empty annotation array on an unchanged render", () => {
    const sequences = ["ACGT"];
    const stackingFn = vi.fn(() => []);
    const callbacks = viewerCallbacks();
    const { rerender } = render(
      <StrictMode>
        <LinearViewer
          sequences={sequences}
          annotations={[]}
          stackingFn={stackingFn}
          {...callbacks}
        />
      </StrictMode>,
    );
    const initialCallCount = stackingFn.mock.calls.length;

    rerender(
      <StrictMode>
        <LinearViewer
          sequences={sequences}
          annotations={[]}
          stackingFn={stackingFn}
          {...callbacks}
        />
      </StrictMode>,
    );

    expect(initialCallCount).toBeGreaterThan(0);
    expect(stackingFn).toHaveBeenCalledTimes(initialCallCount);
  });

  test("restacks annotations when the maximum sequence length changes", () => {
    const annotations = [annotation];
    const callbacks = viewerCallbacks();
    const { rerender } = render(
      <SequenceViewer
        sequences={["ACGT"]}
        annotations={annotations}
        charClassName={() => ""}
        hideMetadataBar
        {...callbacks}
      />,
    );
    const initialCallCount =
      utilitySpies.stackAnnotationsNoOverlap.mock.calls.length;

    rerender(
      <SequenceViewer
        sequences={["ACGTACGT"]}
        annotations={annotations}
        charClassName={() => ""}
        hideMetadataBar
        {...callbacks}
      />,
    );

    expect(
      utilitySpies.stackAnnotationsNoOverlap.mock.calls.length,
    ).toBeGreaterThan(initialCallCount);
    expect(utilitySpies.stackAnnotationsNoOverlap).toHaveBeenLastCalledWith(
      annotations,
      8,
    );
  });

  test.each(["legacy", "explicit"])(
    "applies changed %s validation settings to unchanged invalid input",
    (setting) => {
      const props = {
        sequences: ["ACGT"],
        annotations: [{ ...annotation, start: Number.NaN }],
        charClassName: () => "",
        hideMetadataBar: true,
        ...viewerCallbacks(),
      };
      const { rerender } = render(<SequenceViewer {...props} noValidate />);
      expect(screen.getByRole("status")).toHaveTextContent("Annotation");
      const reactError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      try {
        expect(() =>
          rerender(
            <SequenceViewer
              {...props}
              noValidate={setting === "legacy" ? false : true}
              validationMode={setting === "explicit" ? "strict" : undefined}
            />,
          ),
        ).toThrow(ViewerValidationError);
      } finally {
        reactError.mockRestore();
      }
    },
  );

  test("uses changed character, selection, and selection callback props", () => {
    const sequences = ["A"];
    const annotations = [annotation];
    const oldSetSelection = vi.fn();
    const newSetSelection = vi.fn();
    const { rerender } = render(
      <SequenceViewer
        sequences={sequences}
        annotations={annotations}
        selection={{ ...selection, end: 0 }}
        setSelection={oldSetSelection}
        charClassName={() => "old-character"}
        selectionClassName="old-selection"
        hideMetadataBar
      />,
    );

    rerender(
      <SequenceViewer
        sequences={sequences}
        annotations={annotations}
        selection={{ ...selection, end: 0 }}
        setSelection={newSetSelection}
        charClassName={() => "new-character"}
        selectionClassName="new-selection"
        hideMetadataBar
      />,
    );

    const character = screen.getByText("A");
    expect(character.className).toContain("new-character");
    expect(character.className).toContain("new-selection");
    expect(character.className).not.toContain("old-character");
    expect(character.className).not.toContain("old-selection");

    fireEvent.mouseDown(character);
    expect(newSetSelection).toHaveBeenCalledTimes(1);
    expect(oldSetSelection).not.toHaveBeenCalled();
  });

  test("uses a changed custom stacking callback", () => {
    const sequences = ["ACGT"];
    const annotations = [annotation];
    const oldStackingFn = vi.fn(() => []);
    const newStackingFn = vi.fn(() => []);
    const callbacks = viewerCallbacks();
    const { rerender } = render(
      <LinearViewer
        sequences={sequences}
        annotations={annotations}
        stackingFn={oldStackingFn}
        {...callbacks}
      />,
    );

    rerender(
      <LinearViewer
        sequences={sequences}
        annotations={annotations}
        stackingFn={newStackingFn}
        {...callbacks}
      />,
    );

    expect(oldStackingFn).toHaveBeenCalled();
    expect(newStackingFn).toHaveBeenCalled();
  });
});

describe("empty and shrinking data", () => {
  test("accepts omitted annotations in every viewer", () => {
    render(
      <>
        <SequenceViewer
          sequences={["A"]}
          charClassName={() => ""}
          hideMetadataBar
          {...viewerCallbacks()}
        />
        <LinearViewer sequences={["A"]} {...viewerCallbacks()} />
        <CircularViewer
          sequence="A"
          {...viewerCallbacks()}
          setSelection={vi.fn()}
        />
      </>,
    );

    expect(screen.getByText("1 bp")).toBeTruthy();
    expect(screen.getAllByText("A")).toHaveLength(2);
  });

  test.each([[[]], [[""]]])(
    "renders SequenceViewer input %j without active operations",
    (sequences) => {
      const { container } = render(
        <SequenceViewer
          sequences={sequences}
          selection={selection}
          setSelection={vi.fn()}
          setSequences={vi.fn()}
          charClassName={() => ""}
        />,
      );

      expect(container.firstElementChild?.getAttribute("data-empty")).toBe(
        "true",
      );
      expect(screen.queryByRole("button")).toBeNull();
    },
  );

  test("handles populated-to-empty transitions with a stale selection", () => {
    const setSelection = vi.fn();
    const { container, rerender } = render(
      <>
        <SequenceViewer
          sequences={["ACGT", "AC"]}
          selection={selection}
          setSelection={setSelection}
          setSequences={vi.fn()}
          charClassName={() => ""}
        />
        <LinearViewer
          sequences={["ACGT", "AC"]}
          selection={selection}
          setSelection={setSelection}
        />
        <CircularViewer
          sequence="ACGT"
          selection={selection}
          setSelection={setSelection}
        />
      </>,
    );

    rerender(
      <>
        <SequenceViewer
          sequences={[]}
          selection={selection}
          setSelection={setSelection}
          setSequences={vi.fn()}
          charClassName={() => ""}
        />
        <LinearViewer
          sequences={[""]}
          selection={selection}
          setSelection={setSelection}
        />
        <CircularViewer
          sequence=""
          selection={selection}
          setSelection={setSelection}
        />
      </>,
    );

    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(screen.getByText("0 bp")).toBeTruthy();
    expect(setSelection).not.toHaveBeenCalled();
  });

  test("keeps selection inactive when the first of mixed-length sequences becomes empty", () => {
    const { container } = render(
      <LinearViewer
        sequences={["", "ACGT"]}
        selection={selection}
        setSelection={vi.fn()}
      />,
    );

    expect(container.querySelectorAll("svg rect")).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  test("deactivates copy when a shrink leaves the selection at the new length", () => {
    const staleSelection: AriadneSelection = {
      start: 3,
      end: 4,
      direction: "forward",
    };
    const props = {
      annotations: [annotation],
      selection: staleSelection,
      setSelection: vi.fn(),
      charClassName: () => "",
    };
    const { rerender } = render(
      <SequenceViewer sequences={["ACGT"]} {...props} />,
    );

    expect(
      screen
        .getByRole("button", { name: "Copy to clipboard" })
        .hasAttribute("disabled"),
    ).toBe(false);

    rerender(<SequenceViewer sequences={["ACG"]} {...props} />);

    expect(
      screen
        .getByRole("button", { name: "Copy to clipboard" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  test("uses a valid sequence after a stale copy index", () => {
    vi.useFakeTimers();
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const charClassName = vi.fn(() => "");
    const annotatedSequences: AnnotatedBase[][] = [
      [{ base: "A", annotations: [], index: 0 }],
    ];

    render(
      <CopyDisplay
        seqIdxToCopy={9}
        setSeqIdxToCopy={vi.fn()}
        annotatedSequences={annotatedSequences}
        charClassName={charClassName}
        selection={{ ...selection, end: 0 }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(writeText).toHaveBeenCalledWith("A");
    expect(charClassName).toHaveBeenCalledWith(
      expect.objectContaining({ sequenceIdx: 0 }),
    );
    act(() => vi.runAllTimers());
    vi.useRealTimers();
  });

  test("renders a single-residue linear sequence with finite coordinates", () => {
    const { container } = render(
      <LinearViewer sequences={["A"]} {...viewerCallbacks()} />,
    );
    const line = container.querySelector("svg line");

    expect(line?.getAttribute("x1")).toBe("0%");
    expect(line?.getAttribute("x2")).toBe("100%");
    expect(container.innerHTML).not.toContain("NaN");
  });
});

describe("callbacks, listeners, and shared data", () => {
  test("uses the latest native selection callback", () => {
    const oldOnMouseDown = vi.fn();
    const newOnMouseDown = vi.fn();
    const { rerender } = render(
      <LinearSelectionHarness onMouseDown={oldOnMouseDown} />,
    );

    rerender(<LinearSelectionHarness onMouseDown={newOnMouseDown} />);
    fireEvent.mouseDown(screen.getByTestId("selection-surface"), {
      clientX: 5,
      clientY: 7,
    });

    expect(newOnMouseDown).toHaveBeenCalledWith({ start: { x: 5, y: 7 } });
    expect(oldOnMouseDown).not.toHaveBeenCalled();
  });

  test("removes the exact mouseup listeners registered by SeqContent", () => {
    const added: EventListenerOrEventListenerObject[] = [];
    const removed: EventListenerOrEventListenerObject[] = [];
    const addSpy = vi
      .spyOn(document, "addEventListener")
      .mockImplementation((type, listener, options) => {
        if (type === "mouseup") added.push(listener);
        EventTarget.prototype.addEventListener.call(
          document,
          type,
          listener,
          options,
        );
      });
    const removeSpy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation((type, listener, options) => {
        if (type === "mouseup") removed.push(listener);
        EventTarget.prototype.removeEventListener.call(
          document,
          type,
          listener,
          options,
        );
      });

    const { unmount } = render(
      <StrictMode>
        <SeqContent
          annotatedSequences={[[{ base: "A", annotations: [], index: 0 }]]}
          selection={null}
          setSelection={vi.fn()}
          setHoveredPosition={vi.fn()}
          setActiveAnnotation={vi.fn()}
          stackedAnnotations={[]}
          charClassName={() => ""}
        />
      </StrictMode>,
    );
    unmount();

    expect(added.length).toBeGreaterThan(0);
    expect(removed).toEqual(added);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  test("does not sort a caller-owned annotation array", () => {
    const annotations: StackedAnnotation[] = [
      { ...annotation, text: "later", stack: 2 },
      { ...annotation, text: "earlier", stack: 0 },
    ];

    render(
      <SequenceAnnotation
        annotations={annotations}
        maxAnnotationStack={3}
        index={0}
        maxSequenceLength={4}
        setHoveredPosition={vi.fn()}
        setActiveAnnotation={vi.fn()}
      />,
    );

    expect(annotations.map(({ text }) => text)).toEqual(["later", "earlier"]);
  });
});

const LinearSelectionHarness = ({
  onMouseDown,
}: {
  onMouseDown: (payload: { start: { x: number; y: number } }) => void;
}) => {
  const ref = useRef<SVGSVGElement>(null);
  useLinearSelectionRect({ ref, onMouseDown });
  return <svg ref={ref} data-testid="selection-surface" />;
};
