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
    <div className={classNames("overflow-hiddentext-white flex", className)}>
      {sequence.map((nucl: AnnotatedBase, i: number) => {
        const showTicks = nucl.base !== "-" && (nucl.index + 1) % 10 === 0; // we don't want to show ticks for gaps
        return (
          <div
            className="relative flex h-12 flex-col items-end justify-end"
            key={`base-${i}-index-wrapper`}
          >
            <div
              className={classNames(
                "font-mono",
                "absolute right-0 bottom-0 left-0",

                showTicks ? "opacity-100" : "opacity-0",
                nucl.base === "G" && "text-red-500",
                nucl.base === "A" && "text-yellow-500",
                nucl.base === "T" && "text-green-500",
                nucl.base === "C" && "text-blue-500",
              )}
            >
              <p className="text-xs"> {nucl.index + 1}</p>
              <p className="mx-auto text-xs">|</p>
            </div>

            <div className={classNames("mr-px font-mono opacity-0")}>
              {nucl.base}
            </div>
          </div>
        );
      })}
    </div>
  );
};
