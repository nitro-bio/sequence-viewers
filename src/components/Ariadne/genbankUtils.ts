import genbankParser, { ParsedGenbank } from "genbank-parser";
import { z } from "zod";
import { annotatedSequenceSchema, annotationTypeSchema } from "./schemas";
import { Annotation, AnnotationType } from "./types";
import { safeAnythingToAnnotatedSequences, stackAnnsByType } from "./utils";

export const GenbankFeatureSchema = z.object({
  name: z.string().min(1),
  start: z.number(),
  end: z.number(),
  strand: z.union([z.literal(1), z.literal(-1)]),
  type: annotationTypeSchema,
  notes: z.record(z.array(z.string())).optional(),
});
export type GenbankFeature = z.infer<typeof GenbankFeatureSchema>;

export const genbankToAnnotatedSequence = ({
  genbank,
  annotationOnClick,
}: {
  genbank: ParsedGenbank;
  annotationOnClick?: (annotation: Annotation) => void;
}) => {
  const features = genbank.features.map((feature) => {
    return GenbankFeatureSchema.parse(feature);
  });
  const annotations = genbankFeaturesToAnnotations({
    features,
    annotationOnClick,
  });
  const stackedAnnotations = stackAnnsByType(annotations);
  const { successes, failures } = safeAnythingToAnnotatedSequences({
    payload: genbank.sequence,
    payloadType: "raw",
    annotations: stackedAnnotations,
  });
  if (failures.length > 0) {
    throw new Error(`Failed to parse genbank: ${failures[0]}`);
  }
  if (successes.length !== 1 || successes[0].sequences.length !== 1) {
    throw new Error(`Expected exactly one annotated sequence`);
  }

  return {
    annotatedSequence: annotatedSequenceSchema.parse(successes[0].sequences[0]),
    annotations,
  };
};

export const genbankFeaturesToAnnotations = ({
  features,
  annotationOnClick,
}: {
  features: GenbankFeature[];
  annotationOnClick?: (annotation: Annotation) => void;
}): Annotation[] => {
  return features.map((feature) => {
    const [start, end] = [feature.start, feature.end];
    return {
      type: feature.type,
      start,
      end,
      label: feature.type,
      text: feature.name,
      direction: feature.strand === 1 ? "forward" : "reverse",
      className: getClassNameFromFeatureType(feature.type),
      onClick: annotationOnClick,
    };
  });
};

export function getClassNameFromFeatureType(annType: AnnotationType): string {
  const common =
    "cursor-pointer opacity-60 group-hover:opacity-100 text-xs! hover:opacity-100 pointer-events-all text-white text-clip overflow-hidden whitespace-nowrap";
  const classNameMap: { [key: AnnotationType]: string } = zipArrays(
    [
      "CDS",
      "enhancer",
      "intron",
      "misc_feature",
      "polyA_signal",
      "promoter",
      "protein_bind",
      "rep_origin",
      "LTR",
      "source",
      "insertion",
    ],
    [
      "bg-red-600 fill-red-600 stroke-red-600",
      "bg-blue-600 fill-blue-600 stroke-blue-600",
      "bg-green-600 fill-green-600 stroke-green-600",
      "bg-yellow-600 fill-yellow-600 stroke-yellow-600",
      "bg-orange-600 fill-orange-600 stroke-orange-600",
      "bg-purple-600 fill-purple-600 stroke-purple-600",
      "bg-sky-600 fill-sky-600 stroke-sky-600",
      "bg-teal-600 fill-teal-600 stroke-teal-600",
      "bg-gray-600 fill-gray-600 stroke-gray-600",
      "bg-pink-600 fill-pink-600 stroke-pink-600",
    ],
  );
  if (annType in classNameMap) {
    return `${common} ${classNameMap[annType]!}`;
  }
  return common;
}

export const zipArrays = <T1, T2>(keys: T1[], values: T2[]) => {
  return Object.fromEntries(
    keys.map((key: T1, i: number) => {
      const val: T2 | undefined = values[i];
      return [key, val];
    }),
  ) as { T1: T2 };
};

export const parseGenbank = (genbankString: string) => {
  const result = genbankParser(genbankString);
  return result;
};
