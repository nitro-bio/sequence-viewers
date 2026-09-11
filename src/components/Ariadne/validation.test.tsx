import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { CircularViewer } from "./CircularViewer";
import { LinearViewer } from "./LinearViewer";
import { SequenceViewer } from "./SequenceViewer";
import { annotationSchema, nuclSchema } from "./schemas";
import type { Annotation, StackedAnnotation } from "./types";
import { getAnnotatedSequence, stringToAnnotatedSequence } from "./utils";
import {
  EMPTY_ANNOTATIONS,
  ViewerValidationError,
  resolveValidationMode,
  validateViewerInput,
} from "./validation";

const invalidAnnotation = {
  type: "CDS",
  direction: "sideways",
  start: 1,
  end: 2,
  text: "invalid direction",
} as unknown as Annotation;

const viewerCallbacks = {
  selection: null,
  setSelection: vi.fn(),
};

describe("validation policy", () => {
  test("maps the deprecated option and gives the explicit option precedence", () => {
    expect(resolveValidationMode({})).toBe("recover");
    expect(resolveValidationMode({ noValidate: true })).toBe("recover");
    expect(resolveValidationMode({ noValidate: false })).toBe("strict");
    expect(
      resolveValidationMode({ validationMode: "recover", noValidate: false }),
    ).toBe("recover");
    expect(
      resolveValidationMode({ validationMode: "strict", noValidate: true }),
    ).toBe("strict");
  });

  test("normalizes omitted and empty annotations to one stable value", () => {
    const omitted = validateViewerInput({ sequences: ["ACGT"] });
    const empty = validateViewerInput({ sequences: ["ACGT"], annotations: [] });

    expect(omitted.annotations).toBe(EMPTY_ANNOTATIONS);
    expect(empty.annotations).toBe(EMPTY_ANNOTATIONS);
  });

  test("keeps sequences, coordinates, callback identity, and arbitrary residues unchanged", () => {
    const callbackError = new Error("consumer callback failure");
    const onClick = vi.fn(() => {
      throw callbackError;
    });
    const annotation: Annotation = {
      type: "custom",
      direction: "forward",
      start: 1.25,
      end: 3.75,
      text: "feature",
      onClick,
    };
    const result = validateViewerInput({
      sequences: ["aX?-"],
      annotations: [annotation],
    });

    expect(result.sequences[0]).toBe("aX?-");
    expect(result.annotations[0]).toBe(annotation);
    expect(result.annotations[0].start).toBe(1.25);
    expect(result.annotations[0].end).toBe(3.75);
    expect(result.annotations[0].onClick).toBe(onClick);
    expect(onClick).not.toHaveBeenCalled();
    expect(() => result.annotations[0].onClick?.(annotation)).toThrow(
      callbackError,
    );
  });

  test("rejects null annotation collections and unsafe callback values", () => {
    const badCallback = {
      type: "custom",
      direction: "forward",
      start: 0,
      end: 1,
      text: "bad callback",
      onClick: "not a function",
    } as unknown as Annotation;
    const recovered = validateViewerInput({
      sequences: ["ACGT"],
      annotations: [badCallback],
    });

    expect(recovered.annotations).toBe(EMPTY_ANNOTATIONS);
    expect(recovered.diagnostics[0].message).toContain(
      "onClick must be a function",
    );
    expect(() =>
      validateViewerInput({
        sequences: ["ACGT"],
        annotations: null,
        mode: "strict",
      }),
    ).toThrow(ViewerValidationError);
  });
});

describe("viewer validation boundaries", () => {
  test("preserves valid behavior across all three viewers", () => {
    const validAnnotation = annotationSchema.parse({
      type: "custom",
      direction: "forward",
      start: 0,
      end: 1,
      text: "valid annotation",
    });
    render(
      <>
        <SequenceViewer
          sequences={["ACGT"]}
          annotations={[validAnnotation]}
          charClassName={() => ""}
          hideMetadataBar
          {...viewerCallbacks}
        />
        <LinearViewer
          sequences={["ACGT"]}
          annotations={[validAnnotation]}
          {...viewerCallbacks}
        />
        <CircularViewer
          sequence="ACGT"
          annotations={[validAnnotation]}
          {...viewerCallbacks}
          setSelection={vi.fn()}
        />
      </>,
    );

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("4 bp")).toBeTruthy();
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });

  test("all three viewers exclude malformed annotations and show local diagnostics", () => {
    render(
      <>
        <SequenceViewer
          sequences={["aX?-"]}
          annotations={[invalidAnnotation]}
          charClassName={() => ""}
          hideMetadataBar
          {...viewerCallbacks}
        />
        <LinearViewer
          sequences={["aX?-"]}
          annotations={[invalidAnnotation]}
          {...viewerCallbacks}
        />
        <CircularViewer
          sequence="aX?-"
          annotations={[invalidAnnotation]}
          {...viewerCallbacks}
          setSelection={vi.fn()}
        />
      </>,
    );

    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(
      screen.getAllByText("Some annotations were not displayed."),
    ).toHaveLength(3);
    expect(screen.getByText("4 bp")).toBeTruthy();
    expect(screen.getAllByText("a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("X").length).toBeGreaterThan(0);
    expect(screen.getAllByText("?").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  test("renders a single-residue linear sequence with finite coordinates", () => {
    const { container } = render(
      <LinearViewer sequences={["A"]} {...viewerCallbacks} />,
    );
    const sequenceLine = container.querySelector("svg line");

    expect(sequenceLine?.getAttribute("x1")).toBe("0%");
    expect(sequenceLine?.getAttribute("x2")).toBe("100%");
    expect(container.innerHTML).not.toContain("NaN");
  });

  test("fresh empty annotation arrays keep downstream stacking stable", () => {
    const sequences = ["ACGT"];
    const stackingFn = vi.fn(() => []);
    const { rerender } = render(
      <LinearViewer
        sequences={sequences}
        annotations={[]}
        stackingFn={stackingFn}
        {...viewerCallbacks}
      />,
    );

    rerender(
      <LinearViewer
        sequences={sequences}
        annotations={[]}
        stackingFn={stackingFn}
        {...viewerCallbacks}
      />,
    );

    expect(stackingFn).toHaveBeenCalledTimes(1);
  });

  test("diagnostics stay stable across unchanged input and do not log", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const props = {
      sequences: ["ACGT"],
      annotations: [invalidAnnotation],
      charClassName: () => "",
      hideMetadataBar: true,
      ...viewerCallbacks,
    };
    const { rerender } = render(<SequenceViewer {...props} />);
    const initialDiagnostic = screen.getByRole("status");
    const initialText = initialDiagnostic.textContent;

    rerender(<SequenceViewer {...props} />);

    expect(screen.getByRole("status")).toBe(initialDiagnostic);
    expect(screen.getByRole("status").textContent).toBe(initialText);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  test("unsafe sequence shapes render placeholders before consumer rendering callbacks", () => {
    const charClassName = vi.fn(() => "");
    render(
      <>
        <SequenceViewer
          sequences={[42] as unknown as string[]}
          annotations={[]}
          charClassName={charClassName}
          {...viewerCallbacks}
        />
        <LinearViewer
          sequences={[42] as unknown as string[]}
          annotations={[]}
          {...viewerCallbacks}
        />
        <CircularViewer
          sequence={42 as unknown as string}
          annotations={[]}
          {...viewerCallbacks}
          setSelection={vi.fn()}
        />
      </>,
    );

    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(
      screen.getAllByText("Unable to display sequence data."),
    ).toHaveLength(3);
    expect(charClassName).not.toHaveBeenCalled();
  });

  test("strict mode throws the dedicated validation error", () => {
    const reactError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      render(
        <SequenceViewer
          sequences={["ACGT"]}
          annotations={[invalidAnnotation]}
          validationMode="strict"
          noValidate
          charClassName={() => ""}
          {...viewerCallbacks}
        />,
      ),
    ).toThrow(ViewerValidationError);

    reactError.mockRestore();
  });

  test("explicit recover mode wins over legacy strict mode", () => {
    render(
      <SequenceViewer
        sequences={[42] as unknown as string[]}
        validationMode="recover"
        noValidate={false}
        charClassName={() => ""}
        {...viewerCallbacks}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Unable to display sequence data.",
    );
  });

  test("does not swallow errors thrown by consumer callbacks", () => {
    const callbackError = new Error("consumer stacking failure");
    const reactError = vi.spyOn(console, "error").mockImplementation(() => {});
    const validAnnotation = annotationSchema.parse({
      type: "custom",
      direction: "forward",
      start: 0,
      end: 1,
      text: "valid annotation",
    });

    expect(() =>
      render(
        <LinearViewer
          sequences={["ACGT"]}
          annotations={[validAnnotation]}
          stackingFn={() => {
            throw callbackError;
          }}
          {...viewerCallbacks}
        />,
      ),
    ).toThrow(callbackError);

    reactError.mockRestore();
  });
});

describe("exported parsing behavior", () => {
  test("remains strict by default and recovers without returning invalid objects", () => {
    const malformed = {
      ...invalidAnnotation,
      stack: "top",
    } as unknown as StackedAnnotation;

    expect(() =>
      getAnnotatedSequence({
        sequence: "aX?-",
        stackedAnnotations: [malformed],
      }),
    ).toThrow();

    const recovered = getAnnotatedSequence({
      sequence: "aX?-",
      stackedAnnotations: [malformed],
      noValidate: true,
    });
    expect(recovered.map(({ base, index }) => ({ base, index }))).toEqual([
      { base: "a", index: 0 },
      { base: "X", index: 1 },
      { base: "?", index: 2 },
      { base: "-", index: 3 },
    ]);
    expect(recovered.every((base) => base.annotations.length === 0)).toBe(true);
  });

  test("keeps strict helper defaults and public schemas available", () => {
    expect(stringToAnnotatedSequence({ sequence: "aX?-" })).toHaveLength(4);
    expect(annotationSchema.safeParse(invalidAnnotation).success).toBe(false);
    expect(nuclSchema.safeParse("A").success).toBe(true);
    expect(nuclSchema.safeParse("X").success).toBe(false);

    expect(() =>
      getAnnotatedSequence({
        sequence: 42 as unknown as string,
        stackedAnnotations: [],
      }),
    ).toThrow();
    expect(
      getAnnotatedSequence({
        sequence: 42 as unknown as string,
        stackedAnnotations: [],
        validationMode: "recover",
        noValidate: false,
      }),
    ).toEqual([]);
  });
});
