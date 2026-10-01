import { Angle, AriadneSelection, Coor } from "../types";

/**
 * Taken from seqviz
 * Given an inner and outer radius, and the length of the element, return the
 * path for an arc that circles the plasmid. The optional paramters sweepFWD and sweepREV
 * are needed for selection arcs (where the direction of the arc isn't known beforehand)
 * and arrowFWD and arrowREV are needed for annotations, where there may be directionality
 */
export const genArc = ({
  center,
  innerRadius,
  largeArc,
  length,
  offset,
  outerRadius,
  seqLength,
}: {
  center: Coor;
  innerRadius: number;
  largeArc: boolean;
  length: number;
  offset: number;
  outerRadius: number;
  seqLength: number;
}): string => {
  const leftBottom = findCoor({
    index: offset,
    radius: innerRadius,
    center,
    seqLength,
  });
  const leftTop = findCoor({
    index: offset,
    radius: outerRadius,
    center,
    seqLength,
  });
  const rightBottom = findCoor({
    index: length + offset,
    radius: innerRadius,
    center,
    seqLength,
  });
  const rightTop = findCoor({
    index: length + offset,
    radius: outerRadius,
    center,
    seqLength,
  });
  const sFlagF = 1;
  const sFlagR = 0;

  const lArc = largeArc ? 1 : 0;

  return `M ${rightBottom.x} ${rightBottom.y}
      A ${innerRadius} ${innerRadius}, 0, ${lArc}, ${sFlagR}, ${leftBottom.x} ${leftBottom.y}
      L ${leftBottom.x} ${leftBottom.y}
      L ${leftTop.x} ${leftTop.y}
      A ${outerRadius} ${outerRadius}, 0, ${lArc}, ${sFlagF}, ${rightTop.x} ${rightTop.y}
      Z`;
};

/**
 * Given an index along the plasmid and its radius, find svg coordinate
 * from seqviz
 */
export const findCoor = ({
  index,
  radius,
  center,
  seqLength,
}: {
  index: number;
  radius: number;
  center: Coor;
  seqLength: number;
}): Coor => {
  const lengthPerc = index / seqLength;
  const lengthPercCentered = lengthPerc - 0.25;
  const radians = lengthPercCentered * Math.PI * 2;
  const xAdjust = Math.cos(radians) * radius;
  const yAdjust = Math.sin(radians) * radius;

  return {
    x: center.x + xAdjust,
    y: center.y + yAdjust,
  };
};

export const findIndexFromCoor = ({
  coor,
  center,
  seqLength,
}: {
  coor: Coor;
  center: Coor;
  seqLength: number;
}): number => {
  const x = coor.x - center.x;
  const y = coor.y - center.y;
  const radians = Math.atan2(y, x);
  const lengthPerc = radians / (Math.PI * 2) + 0.25;
  const rawBaseIdx = lengthPerc * seqLength;
  // if we're in negative indices, convert to the end of the sequence
  return Math.round(rawBaseIdx < 0 ? seqLength + rawBaseIdx : rawBaseIdx);
};

export const findAngleFromCoor = ({
  coor,
  center,
}: {
  coor: Coor;
  center: Coor;
}): number => {
  const x = coor.x - center.x;
  const y = coor.y - center.y;
  let radians = Math.atan2(y, x);
  if (radians < 0) {
    radians = radians + Math.PI * 2;
  }
  return radians * (180 / Math.PI);
};

export const findAngleBetweenCoors = ({
  coor1,
  coor2,
  center,
}: {
  coor1: Coor;
  coor2: Coor;
  center: Coor;
}): number => {
  const angle1 = findAngleFromCoor({ coor: coor1, center });
  const angle2 = findAngleFromCoor({ coor: coor2, center });
  const angle = angle2 - angle1;
  return angle;
};

export const findIndexFromAngle = ({
  angle,
  seqLength,
}: {
  angle: Angle;
  seqLength: number;
}): number => {
  // zero degress is 25% of the sequence, and we want keep degrees between 0 and 360
  let effectiveAngle = angle.degrees + 90;
  if (effectiveAngle < 0) {
    effectiveAngle = 360 + effectiveAngle;
  }
  effectiveAngle = effectiveAngle % 360;
  const arcPerc = effectiveAngle / 360;

  const rawBaseIdx = arcPerc * seqLength;
  return Math.round(rawBaseIdx < 0 ? seqLength + rawBaseIdx : rawBaseIdx);
};

export const clampSlice = ({
  slice,
  firstIdx,
  lastIdx,
}: {
  slice: AriadneSelection | null | undefined;
  firstIdx: number;
  lastIdx: number;
}): AriadneSelection | null => {
  if (!slice) {
    return null;
  }
  let { start, end } = slice;

  const outOfBoundsBefore = start < firstIdx && end < firstIdx;
  const outOfBoundsAfter = start > lastIdx && end > lastIdx;

  if (outOfBoundsBefore || outOfBoundsAfter) {
    return null;
  }

  if (start >= end) {
    start = Math.min(start, lastIdx);
    end = Math.max(end, firstIdx);
  } else {
    end = Math.min(end, lastIdx);
    start = Math.max(start, firstIdx);
  }
  return {
    ...slice,
    start,
    end,
  };
};
