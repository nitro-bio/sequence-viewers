import { AnnotatedBase, AnnotatedSequence } from "@Ariadne/types";
import { classNames } from "@utils/stringUtils";

export const ReferenceTicks = ({
  sequence,
  className,
}: {
  sequence: AnnotatedSequence;
  className?: string;
}) => {
  return (
    <div
      className={classNames(
        "nsv-root nsv:overflow-hidden nsv:text-white nsv:flex",
        className,
      )}
    >
      {sequence.map((nucl: AnnotatedBase, i: number) => {
        const showTicks = nucl.base !== "-" && (nucl.index + 1) % 10 === 0; // we don't want to show ticks for gaps
        return (
          <div
            className="nsv:relative nsv:flex nsv:h-12 nsv:flex-col nsv:items-end nsv:justify-end"
            key={`base-${i}-index-wrapper`}
          >
            <div
              className={classNames(
                "nsv:font-mono",
                "nsv:absolute nsv:right-0 nsv:bottom-0 nsv:left-0",

                showTicks ? "nsv:opacity-100" : "nsv:opacity-0",
                nucl.base === "G" && "nsv:text-red-500",
                nucl.base === "A" && "nsv:text-yellow-500",
                nucl.base === "T" && "nsv:text-green-500",
                nucl.base === "C" && "nsv:text-blue-500",
              )}
            >
              <p className="nsv:text-[0.75rem]/[1rem]"> {nucl.index + 1}</p>
              <p className="nsv:mx-auto nsv:text-[0.75rem]/[1rem]">|</p>
            </div>

            <div
              className={classNames("nsv:mr-px nsv:font-mono nsv:opacity-0")}
            >
              {nucl.base}
            </div>
          </div>
        );
      })}
    </div>
  );
};
