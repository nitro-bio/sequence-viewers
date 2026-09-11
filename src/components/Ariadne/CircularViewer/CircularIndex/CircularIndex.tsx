import { AnnotatedSequence } from "@Ariadne/types";
import { Fragment } from "react";
import { findCoor } from "../circularUtils";

export const CircularIndex = ({
  annotatedSequence,
  cx,
  cy,
  radius,
  ticks,
}: {
  annotatedSequence: AnnotatedSequence;
  cx: number;
  cy: number;
  radius: number;
  ticks: number;
}) => {
  const basesPerTick = Math.floor(annotatedSequence.length / ticks);

  if (annotatedSequence.length > 50) {
    return (
      <svg className="nsv:fill-current">
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={radius * 0.75}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
          <Ticks
            cx={cx}
            cy={cy}
            radius={radius * 0.75}
            basesPerTick={basesPerTick}
            totalBases={annotatedSequence.length}
          />
        </g>
      </svg>
    );
  }
  return (
    <text>
      {annotatedSequence.map(({ base: letter }, index) => {
        const { x, y } = findCoor({
          index,
          radius: radius * 0.7,
          center: { x: cx, y: cy },
          seqLength: annotatedSequence.length,
        });
        const rotateDegrees = (index / annotatedSequence.length) * 360;
        return (
          <tspan
            key={`base-${index}`}
            x={x}
            y={y}
            transform={`rotate(${rotateDegrees} ${x} ${y})`}
            textAnchor="middle"
            dominantBaseline="middle"
            color="currentColor"
            fill="currentColor"
            fontSize="0.5rem"
            fontWeight="thin"
            fontFamily="inherit"
            data-seq-index={index}
          >
            {letter}
          </tspan>
        );
      })}
    </text>
  );
};

const Ticks = ({
  radius,
  cx,
  cy,
  basesPerTick,
  totalBases,
}: {
  radius: number;
  cx: number;
  cy: number;
  basesPerTick: number;
  totalBases: number;
}) => {
  const numberOfTicks = Math.floor(totalBases / basesPerTick);
  return (
    <svg>
      {[...Array(numberOfTicks).keys()].map((i) => {
        const { x: x1, y: y1 } = findCoor({
          index: i,
          radius,
          center: { x: cx, y: cy },
          seqLength: totalBases,
        });
        const { x: x2, y: y2 } = findCoor({
          index: i,
          radius: radius * 1.1,
          center: { x: cx, y: cy },
          seqLength: totalBases,
        });
        const rotateDegrees = (i / numberOfTicks) * 360;
        return (
          <Fragment key={`tick-${i}`}>
            <line
              id={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.5}
              transform={`rotate(${rotateDegrees} ${cx} ${cy})`}
            />
            <text
              x={x2}
              y={y2 - 4}
              textAnchor="middle"
              fontSize=".8rem"
              transform={`rotate(${rotateDegrees} ${cx} ${cy})`}
              fill="currentColor"
              opacity={0.75}
            >
              {i * basesPerTick}
            </text>
          </Fragment>
        );
      })}
    </svg>
  );
};
