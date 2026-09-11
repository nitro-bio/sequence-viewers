import type { Annotation } from "./types";

export const EMPTY_ANNOTATIONS: Annotation[] = [];

export const normalizeAnnotations = (annotations?: Annotation[]) =>
  annotations && annotations.length > 0 ? annotations : EMPTY_ANNOTATIONS;

export const getMaxSequenceLength = (sequences: string[]) =>
  sequences.reduce(
    (maxLength, sequence) => Math.max(maxLength, sequence.length),
    0,
  );
