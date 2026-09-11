import { z } from "zod";
import { annotationSchema } from "./schemas";
import type { Annotation } from "./types";

export type ValidationMode = "recover" | "strict";

export interface ViewerValidationOptions {
  /**
   * Controls how viewer components handle structurally invalid input.
   * Defaults to `"recover"`.
   */
  validationMode?: ValidationMode;
  /**
   * @deprecated Use `validationMode`. `true` maps to `"recover"` and `false`
   * maps to `"strict"`.
   */
  noValidate?: boolean;
}

export interface ValidationDiagnostic {
  kind: "sequence" | "annotation";
  index?: number;
  message: string;
}

export interface ValidatedViewerInput {
  sequences: string[];
  annotations: Annotation[];
  diagnostics: ValidationDiagnostic[];
  hasUnsafeSequenceData: boolean;
}

const viewerSequencesSchema = z.array(z.string());

const EMPTY_SEQUENCES: string[] = [];
export const EMPTY_ANNOTATIONS: Annotation[] = [];

export const normalizeAnnotationsInput = (annotations: unknown): unknown =>
  annotations === undefined ||
  (Array.isArray(annotations) && annotations.length === 0)
    ? EMPTY_ANNOTATIONS
    : annotations;

export class ViewerValidationError extends Error {
  readonly diagnostics: ValidationDiagnostic[];

  constructor(diagnostics: ValidationDiagnostic[]) {
    super(formatValidationDiagnostics(diagnostics));
    this.name = "ViewerValidationError";
    this.diagnostics = diagnostics;
  }
}

export const resolveValidationMode = ({
  validationMode,
  noValidate,
}: ViewerValidationOptions): ValidationMode => {
  if (validationMode !== undefined) {
    return validationMode;
  }
  if (noValidate !== undefined) {
    return noValidate ? "recover" : "strict";
  }
  return "recover";
};

const issueMessage = (issue: z.core.$ZodIssue) => {
  const path = issue.path.length > 0 ? ` at ${issue.path.join(".")}` : "";
  return `${issue.message}${path}`;
};

export const formatValidationDiagnostics = (
  diagnostics: ValidationDiagnostic[],
) =>
  diagnostics
    .map((diagnostic) => {
      const index =
        diagnostic.index === undefined ? "" : ` ${diagnostic.index + 1}`;
      return `${diagnostic.kind === "sequence" ? "Sequence" : "Annotation"}${index}: ${diagnostic.message}`;
    })
    .join("; ");

/**
 * Validates the structural data shared by the three viewers. Valid values are
 * returned without residue, case, coordinate, callback, or object-identity
 * normalization.
 */
export const validateViewerInput = ({
  sequences,
  annotations,
  mode = "recover",
}: {
  sequences: unknown;
  annotations?: unknown;
  mode?: ValidationMode;
}): ValidatedViewerInput => {
  const diagnostics: ValidationDiagnostic[] = [];
  const sequenceResult = viewerSequencesSchema.safeParse(sequences);

  if (!sequenceResult.success) {
    sequenceResult.error.issues.forEach((issue) => {
      const rawIndex = issue.path[0];
      diagnostics.push({
        kind: "sequence",
        index: typeof rawIndex === "number" ? rawIndex : undefined,
        message: issueMessage({ ...issue, path: issue.path.slice(1) }),
      });
    });
  }

  let validAnnotations: Annotation[];
  if (annotations === undefined) {
    validAnnotations = EMPTY_ANNOTATIONS;
  } else if (!Array.isArray(annotations)) {
    validAnnotations = EMPTY_ANNOTATIONS;
    diagnostics.push({
      kind: "annotation",
      message: "Expected an array of annotations",
    });
  } else if (annotations.length === 0) {
    validAnnotations = EMPTY_ANNOTATIONS;
  } else {
    validAnnotations = [];
    annotations.forEach((annotation, index) => {
      const result = annotationSchema.safeParse(annotation);
      const onClick =
        typeof annotation === "object" && annotation !== null
          ? (annotation as { onClick?: unknown }).onClick
          : undefined;
      if (
        result.success &&
        (onClick === undefined || typeof onClick === "function")
      ) {
        // Validation is structural. Keep the caller's original object so
        // callbacks and any additional consumer metadata remain intact.
        validAnnotations.push(annotation as Annotation);
        return;
      }
      diagnostics.push({
        kind: "annotation",
        index,
        message: result.success
          ? "onClick must be a function when provided"
          : result.error.issues.map(issueMessage).join(", "),
      });
    });
    if (validAnnotations.length === 0) {
      validAnnotations = EMPTY_ANNOTATIONS;
    }
  }

  if (mode === "strict" && diagnostics.length > 0) {
    throw new ViewerValidationError(diagnostics);
  }

  return {
    sequences: sequenceResult.success
      ? (sequences as string[])
      : EMPTY_SEQUENCES,
    annotations: validAnnotations,
    diagnostics,
    hasUnsafeSequenceData: !sequenceResult.success,
  };
};
