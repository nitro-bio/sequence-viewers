import { getSubsequenceLength } from "@Ariadne/utils";
import { classNames } from "@utils/stringUtils";
import { Fragment } from "react";
import { AnnotatedSequence, Annotation, StackedAnnotation } from "../types";

export interface LinearAnnotationGutterProps {
  stackedAnnotations: StackedAnnotation[];
  sequence: AnnotatedSequence;
  containerClassName?: string;
}

export const LinearAnnotationGutter = ({
  stackedAnnotations,
  sequence,
  containerClassName,
}: LinearAnnotationGutterProps) => {
  const stacks: StackedAnnotation[][] = [];
  stackedAnnotations.forEach((ann) => {
    stacks[ann.stack] = stacks[ann.stack] || [];
    stacks[ann.stack].push(ann);
  });
  return (
    <div
      className={classNames(
        "nsv-root nsv:grid-rows-auto nsv:block nsv:grid nsv:grid-cols-1 nsv:gap-1",
        containerClassName,
      )}
    >
      {stacks.map((annotations, stackIdx) => (
        <div
          key={`annotation-stack-${stackIdx}`}
          className="nsv:relative nsv:h-8"
        >
          {annotations.map((annotation) => (
            <LinearAnnotation
              key={`annotation-${annotation.text}-${annotation.start}-${annotation.end}-${annotation.direction}`}
              annotation={annotation}
              sequence={sequence}
              stackIdx={stackIdx}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
const LinearAnnotation = ({
  annotation,
  sequence,
  stackIdx,
}: {
  annotation: Annotation;
  sequence: AnnotatedSequence;
  stackIdx: number;
}) => {
  /* if the annotation spans the seam, we draw two lines from the beginning to end, and from start to end */

  const annotationSpansSeam = annotation.start > annotation.end;
  if (annotationSpansSeam) {
    return (
      <Fragment>
        <LinearAnnotation
          annotation={{
            ...annotation,
            end: sequence.length,
            onClick: () => {
              annotation.onClick?.({ ...annotation });
            },
          }}
          sequence={sequence}
          stackIdx={stackIdx}
        />
        <LinearAnnotation
          annotation={{
            ...annotation,
            start: 0,
            onClick: () => {
              annotation.onClick?.({ ...annotation });
            },
          }}
          sequence={sequence}
          stackIdx={stackIdx}
        />
      </Fragment>
    );
  }

  const annotationRectangleWidthPerc =
    (getSubsequenceLength(annotation, sequence.length) / sequence.length) * 100;

  const xPerc =
    (Math.min(annotation.start, annotation.end) / sequence.length) * 100;
  // clip path to create rectangle with a point at one end
  const forwardClipPath = "polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)";
  const reverseClipPath = "polygon(0 50%, 10% 0, 100% 0, 100% 100%, 10% 100%)";
  return (
    <div
      className="nsv:group nsv:absolute"
      style={{
        marginLeft: `${xPerc}%`,
        width: `${annotationRectangleWidthPerc}%`,
      }}
      onClick={() => {
        annotation.onClick?.(annotation);
      }}
    >
      <div
        className={classNames(
          "nsv:px-2",
          annotation.direction === "forward"
            ? "nsv:text-left"
            : "nsv:text-right",
          annotation.className,
        )}
        style={{
          clipPath:
            annotation.direction === "forward"
              ? forwardClipPath
              : reverseClipPath,
        }}
      >
        {annotation.text}
      </div>
      <div
        className={classNames(
          "nsv:absolute nsv:left-1/2 nsv:z-10 nsv:hidden nsv:[translate:-50%_1rem] nsv:flex-col nsv:rounded-md nsv:px-2 nsv:py-1 nsv:text-[0.875rem]/[1.25rem] nsv:group-hover:flex",
          annotation.className,
        )}
      >
        <span>{annotation.text}</span>
        <span>{annotation.type}</span>
      </div>
    </div>
  );
};
