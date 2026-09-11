import type { Annotation } from "./types";

export const EMPTY_ANNOTATIONS: Annotation[] = [];

export const getMaxSequenceLength = (sequences: string[]) =>
  sequences.reduce(
    (maxLength, sequence) => Math.max(maxLength, sequence.length),
    0,
  );
