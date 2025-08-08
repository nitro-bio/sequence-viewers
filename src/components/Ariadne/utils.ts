import genbankParser, { ParsedGenbank } from "genbank-parser";
import { genbankToAnnotatedSequence } from "./genbankUtils";
import { annotatedSequenceSchema } from "./schemas";
import type {
  AnnotatedSequence,
  Annotation,
  AnnotationType,
  AriadneSelection,
  StackedAnnotation,
} from "./types";

export const getComplement = (sequence: string) => {
  const complement: {
    [key: string]: "A" | "T" | "C" | "G" | "N";
  } = {
    A: "T",
    T: "A",
    C: "G",
    G: "C",
    N: "N",
  };
  return sequence
    .split("")
    .map((base) => {
      if (base in complement) {
        return complement[base];
      } else {
        return "?";
      }
    })
    .join("");
};

export const getAnnotatedSequence = ({
  sequence,
  stackedAnnotations,
  noValidate,
}: {
  sequence: string;
  stackedAnnotations: Annotation[];
  noValidate?: boolean;
}): AnnotatedSequence => {
  /* loop through sequence finding all annoatations that apply to each base */
  const mapFn = (base: string, idx: number) => {
    const annotationsForBase = stackedAnnotations.filter((annotation) => {
      // if the annotation spans the seam of the plasmid
      if (annotation.start > annotation.end) {
        const isBetweenAnnotationStartAndEndofSequence =
          idx >= annotation.start && idx <= sequence.length;
        const isBetweenStartOfSequenceAndAnnotationEnd =
          idx >= 0 && idx <= annotation.end;
        return (
          isBetweenAnnotationStartAndEndofSequence ||
          isBetweenStartOfSequenceAndAnnotationEnd
        );
      } else {
        // regular case
        return idx >= annotation.start && idx <= annotation.end;
      }
    });
    return {
      base,
      index: idx,
      annotations: annotationsForBase,
      complement: getComplement(base),
    };
  };
  const raw = sequence
    .split("")
    .map(mapFn)
    .filter((x) => x.base !== " "); // remove padding
  const annotatedSequence = annotatedSequenceSchema.safeParse(raw);
  if (noValidate) {
    if (annotatedSequence.success === false) {
      console.warn(annotatedSequence.error);
    }
    return raw as unknown as AnnotatedSequence;
  }
  if (annotatedSequence.success === false) {
    throw new Error(annotatedSequence.error.message);
  }
  return annotatedSequence.data;
};

interface Stackable {
  start: number;
  end: number;
}
// modified from seqviz
export const stackElements = <T extends Stackable>(elements: T[]) => {
  if (elements.length === 0) {
    return [];
  }
  // utility funcs for stackElements
  const last = (arr: T[]): T => arr[arr.length - 1];
  const first = (arr: T[]): T => arr[0];
  const maxIndex = elements.map((e) => e.end).reduce((a, b) => Math.max(a, b));

  const stack: T[][] = [];
  elements.forEach((a) => {
    const insertIndex = stack.findIndex((elems) => {
      if (a.end === a.start) {
        // the element has the same start and end index and therefore spans the whole and gets its own row
        return -1;
      }
      if (last(elems).end <= last(elems).start) {
        // if the last element in this row crosses zero index it gets its own row
        return last(elems).end + maxIndex <= a.start;
      }
      if (a.end > a.start) {
        // this element doesn't cross the zero index and the last in row doesn't
        return last(elems).end <= a.start;
      }
      // both this curr element and the last in the row cross the zero index
      return last(elems).end < a.start && a.end < first(elems).start;
    });

    if (insertIndex > -1) {
      // insert in the row where it's the new highest
      stack[insertIndex].push(a);
    } else {
      // create a new row for this entry
      stack.push([a]);
    }
  });
  return stack.map((row) => row.sort((a, b) => a.start - b.start));
};

// returns annotations with their stack index and max stack index
export const getStackedAnnotations = (
  annotations: Annotation[],
): StackedAnnotation[] => {
  const stackedAnnotations = stackElements(annotations);
  return stackedAnnotations
    .map((row, idx) => row.map((annotation) => ({ ...annotation, stack: idx })))
    .flat();
};
export const baseInSelection = ({
  baseIndex,
  selection,
  sequenceLength,
}: {
  baseIndex: number;
  sequenceLength: number;
  selection: AriadneSelection | null;
}) => {
  if (!selection) {
    return false;
  }
  const { start, end } = selection;
  if (start === end) {
    return baseIndex === start;
  }
  if (start < end) {
    return inRange(baseIndex, start, end);
  } else {
    // spans seam
    return (
      inRange(baseIndex, start, sequenceLength) || inRange(baseIndex, 0, end)
    );
  }
};

export const inRange = (value: number, min: number, max: number) => {
  return value >= min && value <= max;
};

export const getSubsequenceLength = (
  { start, end }: AriadneSelection,
  sequenceLength: number,
) => {
  if (start < end) {
    return end - start;
  } else {
    return sequenceLength - start + end;
  }
};

interface StringSource {
  payloadType: "genbank" | "fasta" | "raw";
  payload: string;
  annotations?: Annotation[];
  annotationOnClick?: (annotation: Annotation) => void;
}

interface GenbankSource {
  payloadType: "parsed-genbank";
  payload: ParsedGenbank;
  annotations?: undefined;
  annotationOnClick?: (annotation: Annotation) => void;
}
type AnythingSource = StringSource | GenbankSource;

type ParseError = {
  source: AnythingSource;
  error: string;
};
type ParseSuccess = {
  source: AnythingSource;
  sequences: AnnotatedSequence[];
  annotations: Annotation[];
};
export const anythingToAnnotatedSequences = ({
  payload,
  payloadType,
  annotations,
  annotationOnClick,
}: AnythingSource): {
  sequences: AnnotatedSequence[];
  stackedAnnotations: StackedAnnotation[];
} => {
  const { successes, failures } = safeAnythingToAnnotatedSequences({
    payload,
    payloadType,
    annotations,
    annotationOnClick,
  } as AnythingSource);
  if (failures.length > 0) {
    const failString = failures.map((f) => f.error).join("\n");
    throw new Error(`Parse failures: ${failString}`);
  }
  const sequences = successes.map((s) => s.sequences).flat();
  const newAnnotations: Annotation[] = successes
    .map((s) => s.annotations)
    .flat();
  const stackedAnnotations = getStackedAnnotations(newAnnotations);
  return { sequences, stackedAnnotations };
};

export const safeAnythingToAnnotatedSequences = ({
  payload,
  payloadType,
  annotations,
  annotationOnClick,
}: AnythingSource): { successes: ParseSuccess[]; failures: ParseError[] } => {
  const successes: ParseSuccess[] = [];
  const failures: ParseError[] = [];
  switch (payloadType) {
    case "raw": {
      try {
        const sequences = [
          stringToAnnotatedSequence({
            sequence: payload,
            annotations: annotations ?? [],
          }),
        ];
        successes.push({
          source: {
            payload,
            annotations,
            annotationOnClick,
            payloadType,
          },
          sequences: sequences,
          annotations: annotations ?? [],
        });
      } catch (e) {
        failures.push({
          source: {
            payload,
            annotations,
            annotationOnClick,
            payloadType,
          },
          error: `Failed to parse raw sequence: ${e}`,
        });
      }
      break;
    }
    case "parsed-genbank":
    case "genbank": {
      const parsed =
        payloadType === "parsed-genbank" ? [payload] : genbankParser(payload);

      parsed.forEach((genbank) => {
        try {
          const sequence = genbankToAnnotatedSequence({
            genbank,
            annotationOnClick,
          }).annotatedSequence;
          successes.push({
            source: {
              payload,
              annotations,
              annotationOnClick,
              payloadType,
            } as AnythingSource,
            sequences: [sequence],
            annotations: [],
          });
        } catch (e) {
          failures.push({
            source: {
              payload,
              annotations,
              annotationOnClick,
              payloadType,
            } as AnythingSource,
            error: `Failed to parse genbank: ${e}`,
          });
        }
      });
      break;
    }
    case "fasta": {
      let records: (FastaRecord | FastqRecord)[];
      if (payloadType === "fasta") {
        records = parseFasta(payload);
      } else {
        // fastq
        records = parseFastq(payload);
      }
      records.forEach((record) => {
        try {
          const res = safeAnythingToAnnotatedSequences({
            payload: record.sequence,
            payloadType: "raw",
          });
          failures.push(...res.failures);
          successes.push(...res.successes);
        } catch (e) {
          failures.push({
            source: {
              payload,
              annotations,
              annotationOnClick,
              payloadType,
            },
            error: `Failed to parse ${payloadType}: ${e}`,
          });
        }
      });
      break;
    }
    default: {
      failures.push({
        source: {
          payload,
          annotations,
          annotationOnClick,
          payloadType,
        },
        error: `Unknown payload type: ${payloadType}`,
      });
      break;
    }
  }

  return {
    successes,
    failures,
  };
};

export const stringToAnnotatedSequence = ({
  sequence,
  annotations,
}: {
  sequence: string;
  annotations?: Annotation[];
}): AnnotatedSequence => {
  const stackedAnnotations = getStackedAnnotations(annotations ?? []);
  const annotatedSequence = getAnnotatedSequence({
    sequence,
    stackedAnnotations,
  });
  return annotatedSequence;
};

// Determine if two annotations from the same sequence overlap.
export const annotationsHaveOverlap = (
  a1: Annotation,
  a2: Annotation,
  maxLen: number,
): boolean => {
  if (
    baseInSelection({
      baseIndex: a1.start,
      selection: a2,
      sequenceLength: maxLen,
    })
  ) {
    return true;
  }
  if (
    baseInSelection({
      baseIndex: a1.end,
      selection: a2,
      sequenceLength: maxLen,
    })
  ) {
    return true;
  }
  if (
    baseInSelection({
      baseIndex: a2.start,
      selection: a1,
      sequenceLength: maxLen,
    })
  ) {
    return true;
  }
  if (
    baseInSelection({
      baseIndex: a2.end,
      selection: a1,
      sequenceLength: maxLen,
    })
  ) {
    return true;
  }
  return false;
};

// Create StackedAnnotations such that no "stack" or line of annotations have
// any overlapping annotations.
export const stackAnnotationsNoOverlap = (
  annotations: Annotation[],
  maxLen: number,
): StackedAnnotation[] => {
  const annotationsByStack = [] as Annotation[][];

  annotations.map((annotation) => {
    let curStack = 0;
    while (true) {
      const stackAnns = annotationsByStack[curStack];
      if (!stackAnns) {
        annotationsByStack[curStack] = [annotation];
        return;
      }

      let overlap = false;
      for (const stackedAnn of stackAnns) {
        if (annotationsHaveOverlap(annotation, stackedAnn, maxLen)) {
          overlap = true;
          break;
        }
      }

      if (overlap) {
        // A overlap was detected so try the next line.
        curStack += 1;
      } else {
        // If no overlaps detected on this stack then add the
        // annotation to this line.
        annotationsByStack[curStack].push(annotation);
        return;
      }
    }
  });

  // Convert annotations to stacked annotations
  const stackedAnnotations = [] as StackedAnnotation[];
  annotationsByStack.forEach((stackedAnns, index) => {
    stackedAnns.forEach((annotation) => {
      stackedAnnotations.push({
        ...annotation,
        stack: index,
      });
    });
  });

  return stackedAnnotations;
};

export const stackAnnsByType = (
  annotations: Annotation[],
): StackedAnnotation[] => {
  // create a map of annotation type to list
  const annotationMap = annotations.reduce(
    (acc: { [key: AnnotationType]: Annotation[] }, annotation: Annotation) => {
      if (acc[annotation.type] === undefined) {
        acc[annotation.type] = [];
      }
      acc[annotation.type]!.push(annotation);
      return acc;
    },
    {} as { [key: AnnotationType]: Annotation[] },
  );

  const stacks = Object.values(annotationMap)
    .map((stack, stackIdx) => {
      return stack.map((annotation: Annotation) => {
        const res: StackedAnnotation = {
          ...annotation,
          stack: stackIdx,
        };
        return res;
      });
    })
    .flat();

  return stacks;
};

interface FastqRecord {
  id: string;
  sequence: string;
  optionalId: string;
  quality: string;
}

export function parseFastq(data: string): FastqRecord[] {
  const lines = data.trim().split("\n");
  const records: FastqRecord[] = [];

  for (let i = 0; i < lines.length; i += 4) {
    const record: FastqRecord = {
      id: lines[i].substring(1),
      sequence: lines[i + 1],
      optionalId: lines[i + 2].substring(1),
      quality: lines[i + 3],
    };

    records.push(record);
  }

  return records;
}

interface FastaRecord {
  id: string;
  sequence: string;
}

export function parseFasta(data: string): FastaRecord[] {
  const lines = data.trim().split("\n");
  const records: FastaRecord[] = [];

  for (let i = 0; i < lines.length; i += 2) {
    const record: FastaRecord = {
      id: lines[i].substring(1),
      sequence: lines[i + 1],
    };

    records.push(record);
  }

  return records;
}

export const downloadAsFasta = ({
  annotatedSequences,
  wrap = 60,
  filePrefix = "nitro-sequence-viewer",
  headerFor = (idx: number) => `Sequence_${idx + 1}`,
}: {
  annotatedSequences: AnnotatedSequence[];
  wrap?: number;
  filePrefix?: string;
  headerFor?: (idx: number) => string;
}) => {
  const NON_ALPHABETIC = /[^A-Za-z*]/g; // keep letters and '*' (stop) only

  const wrapSeq = (s: string, n: number) =>
    n > 0 ? s.match(new RegExp(`.{1,${n}}`, "g"))?.join("\n") : s;

  const fastaContent =
    annotatedSequences
      .map((sequence, idx) => {
        // 1) build raw string from per-base annotations
        const raw = sequence.map((b) => b.base ?? "").join("");

        // 2) optionally strip gaps; always strip whitespace
        const ungapped = raw.replace(/\s/g, "");

        // 3) normalize: uppercase and drop weird chars that sneak in
        const seqString = ungapped.toUpperCase().replace(NON_ALPHABETIC, "");

        if (!seqString.length) return null; // skip empty sequences

        // 4) sanitize header (no leading '>', no spaces)
        const header = String(headerFor(idx))
          .replace(/^>/, "")
          .replace(/\s+/g, "_");

        // 5) wrap to fixed width (recommended for FASTA)
        const wrapped = wrapSeq(seqString, wrap);

        return `>${header}\n${wrapped}`;
      })
      .filter(Boolean)
      .join("\n") + "\n"; // final newline is nice to have

  const blob = new Blob([fastaContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `${filePrefix}_${date}.fasta`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
