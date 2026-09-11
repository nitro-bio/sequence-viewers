import type { ValidationDiagnostic } from "./validation";

export const ViewerValidationMessages = ({
  diagnostics,
  sequenceUnavailable = false,
}: {
  diagnostics: ValidationDiagnostic[];
  sequenceUnavailable?: boolean;
}) => {
  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <div
      className="nsv-root nsv:rounded nsv:[border-width:1px] nsv:border-amber-500 nsv:p-2 nsv:text-[0.875rem]/[1.25rem]"
      role={sequenceUnavailable ? "alert" : "status"}
      aria-live={sequenceUnavailable ? "assertive" : "polite"}
      data-nsv-validation="diagnostic"
    >
      <p>
        {sequenceUnavailable
          ? "Unable to display sequence data."
          : "Some annotations were not displayed."}
      </p>
      <ul>
        {diagnostics.map((diagnostic, diagnosticIndex) => (
          <li
            key={`${diagnostic.kind}-${diagnostic.index ?? "all"}-${diagnosticIndex}`}
          >
            {diagnostic.kind === "sequence" ? "Sequence" : "Annotation"}
            {diagnostic.index === undefined
              ? ""
              : ` ${diagnostic.index + 1}`}: {diagnostic.message}
          </li>
        ))}
      </ul>
    </div>
  );
};
