import { z } from "zod";

export const coorSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const angleSchema = z.object({
  degrees: z.number(),
  center: coorSchema,
});

export const annotationTypeSchema = z.union([
  z.literal("CDS"),
  z.literal("enhancer"),
  z.literal("intron"),
  z.literal("misc_feature"),
  z.literal("polyA_signal"),
  z.literal("promoter"),
  z.literal("protein_bind"),
  z.literal("rep_origin"),
  z.literal("LTR"),
  z.string(),
]);

export const annotationSchema = z.object({
  type: annotationTypeSchema,
  direction: z.union([z.literal("forward"), z.literal("reverse")]),
  start: z.number(),
  end: z.number(),
  className: z.string().optional(),
  text: z.string(),
  onClick: z.any().optional(),
});

export const stackedAnnotationSchema = annotationSchema.extend({
  stack: z.number(),
});

export const nuclSchema = z.union([
  z.literal("A"),
  z.literal("C"),
  z.literal("G"),
  z.literal("T"),
]);

export const aaSchema = z.union([
  // Add all your amino acids literals here
  z.literal("A"),
  z.literal("C"),
  z.literal("D"),
  z.literal("E"),
  z.literal("F"),
  z.literal("G"),
  z.literal("H"),
  z.literal("I"),
  z.literal("K"),
  z.literal("L"),
  z.literal("M"),
  z.literal("N"),
  z.literal("P"),
  z.literal("Q"),
  z.literal("R"),
  z.literal("S"),
  z.literal("T"),
  z.literal("V"),
  z.literal("W"),
  z.literal("Y"),
]);
export const GapSchema = z.literal("-");
export const StopSchema = z.literal("*");
export const SpaceSchema = z.literal(" ");
export const UnknownSchema = z.literal("?");
export const annotatedBaseSchema = z.object({
  base: z.string().length(1),
  annotations: z.array(stackedAnnotationSchema),
  index: z.number(),
});

export const annotatedSequenceSchema = z.array(annotatedBaseSchema);

export const ariadneSelectionSchema = z.object({
  start: z.number(),
  end: z.number(),
  direction: z.union([z.literal("forward"), z.literal("reverse")]),
});
