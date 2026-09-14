import { expect, test } from "vitest";
import { getAnnotatedSequence } from "./utils";

const annotation = (start: number, end: number, text = "feature") => ({
  start,
  end,
  text,
  type: "CDS",
  direction: "forward" as const,
  stack: 0,
});

test.each([
  { start: -2, end: 2, covered: [0, 1, 2] },
  { start: 1.2, end: 3.8, covered: [2, 3] },
  { start: -2, end: -1, covered: [] },
  { start: 7, end: 9, covered: [] },
  { start: 4, end: 1, covered: [0, 1, 4, 5] },
  { start: 4.2, end: 1.8, covered: [0, 1, 5] },
  { start: 4, end: -1, covered: [4, 5] },
  { start: 7, end: 2, covered: [0, 1, 2] },
  { start: -1, end: -2, covered: [0, 1, 2, 3, 4, 5] },
  { start: 2, end: 2, covered: [2] },
  { start: 2.5, end: 2.5, covered: [] },
])("preserves coverage for $start through $end", ({ start, end, covered }) => {
  const result = getAnnotatedSequence({
    sequence: "ACGTAC",
    stackedAnnotations: [annotation(start, end)],
  });

  expect(
    result.filter((base) => base.annotations.length).map((base) => base.index),
  ).toEqual(covered);
});

test("preserves caller annotation order, padding coordinates, and public output shape", () => {
  const onClick = () => {};
  const late = { ...annotation(2, 4, "later start"), onClick, privateField: 1 };
  const early = annotation(0, 4, "earlier start");
  const result = getAnnotatedSequence({
    sequence: "a CGt",
    stackedAnnotations: [late, early],
  });

  expect(result).toEqual([
    { base: "a", index: 0, annotations: [early] },
    {
      base: "C",
      index: 2,
      annotations: [{ ...annotation(2, 4, "later start"), onClick }, early],
    },
    {
      base: "G",
      index: 3,
      annotations: [{ ...annotation(2, 4, "later start"), onClick }, early],
    },
    {
      base: "t",
      index: 4,
      annotations: [{ ...annotation(2, 4, "later start"), onClick }, early],
    },
  ]);
  expect(result[1].annotations[0]).not.toBe(late);
  expect(result[1].annotations[0].onClick).toBe(onClick);
});

test("strict and recover modes preserve invalid-annotation behavior", () => {
  const invalid = { ...annotation(0, 1), stack: "not a number" };
  const stackedAnnotations = [
    annotation(2, 3),
    invalid,
  ] as unknown as Parameters<
    typeof getAnnotatedSequence
  >[0]["stackedAnnotations"];

  expect(() =>
    getAnnotatedSequence({ sequence: "ACGT", stackedAnnotations }),
  ).toThrow();
  expect(
    getAnnotatedSequence({
      sequence: "ACGT",
      stackedAnnotations,
      validationMode: "recover",
    }),
  ).toEqual([
    { base: "A", index: 0, annotations: [] },
    { base: "C", index: 1, annotations: [] },
    { base: "G", index: 2, annotations: [annotation(2, 3)] },
    { base: "T", index: 3, annotations: [annotation(2, 3)] },
  ]);
});
