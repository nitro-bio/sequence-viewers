import { findAngleFromCoor } from "@Ariadne/CircularViewer/circularUtils";
import { Angle, Coor } from "@Ariadne/types";
import { inRange } from "@Ariadne/utils";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useStateRef } from "./useStateRef";

/* useLinearSelectionRect manages the selection of a LinearSelection within
 * the LinearViewer.
 *
 * ref (RefObject) A reference to the svg containing the LinearSelection.
 * onMouseUp: Optional handler when user releases the mouse
 * onMouseDown: Optional handler when user presses the mouse on the LinearSelection.
 * onMouseMove: Optional handler when user drags.
 */
export const useLinearSelectionRect = <
  T extends {
    getBoundingClientRect(): DOMRect;
    addEventListener: (type: string, listener: (e: MouseEvent) => void) => void;
    removeEventListener: (
      type: string,
      listener: (e: MouseEvent) => void,
    ) => void;
  },
>({
  ref,
  onMouseUp,
  onMouseDown,
  onMouseMove,
}: {
  ref: RefObject<T | null>;
  onMouseUp?: (payload: { start: Coor; end: Coor }) => void;
  onMouseDown?: (payload: { start: Coor }) => void;
  onMouseMove?: (payload: { start: Coor; end: Coor }) => void;
}) => {
  const [start, setStart, startRef] = useStateRef<Coor | null>(null);
  const [end, setEnd, endRef] = useStateRef<Coor | null>(null);

  const [direction, setDirection] = useState<"forward" | "reverse">("forward");

  const active = useRef(false);

  const _onMouseDown = useCallback(
    (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top } = ref.current?.getBoundingClientRect() || {
        left: 0,
        top: 0,
      };
      const x = clientX - left;
      const y = clientY - top;
      active.current = true;
      setStart({ x, y });
      setEnd({ x, y });
      onMouseDown?.({ start: { x, y } });
    },
    [onMouseDown, ref, setEnd, setStart],
  );
  const _onMouseUp = useCallback(() => {
    active.current = false;
    if (startRef.current && endRef.current) {
      onMouseUp?.({ start: startRef.current, end: endRef.current });
    } else {
      console.error("start or end is null when mouseup");
    }
  }, [endRef, onMouseUp, startRef]);

  // must use refs in event handlers to get most up to date values
  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (active.current) {
        const { clientX, clientY } = e;
        const { left, top } = ref.current?.getBoundingClientRect() || {
          left: 0,
          top: 0,
        };
        const x = clientX - left;
        const y = clientY - top;
        const startX = startRef.current?.x;
        if (startX !== undefined && startX > x) {
          setDirection("reverse");
        } else {
          setDirection("forward");
        }
        setEnd({ x, y });
        if (startRef.current && endRef.current) {
          onMouseMove?.({ start: startRef.current, end: endRef.current });
        } else {
          console.error("start is null when mousemove");
        }
      }
    },
    [endRef, onMouseMove, ref, setEnd, startRef],
  );
  useEffect(() => {
    const node = ref?.current;
    if (node) {
      node.addEventListener("mousedown", _onMouseDown);
      node.addEventListener("mousemove", _onMouseMove);
    }
    if (typeof window !== "undefined") {
      // still want to call mouseup if mouse leaves parent
      window.addEventListener("mouseup", _onMouseUp);
    }
    return () => {
      node?.removeEventListener("mousedown", _onMouseDown);
      node?.removeEventListener("mousemove", _onMouseMove);
      window?.removeEventListener("mouseup", _onMouseUp);
    };
  }, [_onMouseDown, _onMouseMove, _onMouseUp, ref]);
  return { start, end, direction };
};

// for circular coordinates
export const useCircularSelectionRect = (
  ref: RefObject<SVGSVGElement | null>,
) => {
  const [start, setStart, startRef] = useStateRef<Angle | null>(null);
  const [end, setEnd] = useStateRef<Angle | null>(null);

  const [direction, setDirection] = useState<
    "clockwise" | "counterclockwise" | null
  >(null);
  const ANGLE_DELTA_THRESHOLD_IN_DEGREES = 2;

  const active = useRef(false);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (ref.current) {
        console.debug("resetting start and end");
        setStart(null);
        setEnd(null);
        setDirection(null);
        active.current = true;

        const { clientX, clientY } = e;
        const { left, top, width, height } =
          ref.current.getBoundingClientRect();
        const x = clientX - left;
        const y = clientY - top;
        const center = { x: width / 2, y: height / 2 };
        const startAngle = findAngleFromCoor({ coor: { x, y }, center });
        setStart({
          degrees: startAngle,
          center,
        });
      }
    },
    [ref, setDirection, setEnd, setStart],
  );

  const onMouseUp = useCallback(() => {
    active.current = false;

    setDirection(null);
  }, [setDirection]);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (active.current && ref.current) {
        const { clientX, clientY } = e;
        const { left, top, width, height } =
          ref.current.getBoundingClientRect();
        const x = clientX - left;
        const y = clientY - top;
        const center = { x: width / 2, y: height / 2 };
        // if we're close to the center, don't update selection
        if (
          Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2)) <
          0.4 * (width / 2)
        ) {
          console.debug("within 0.5 radius of center, not updating selection");
          return;
        }

        const endAngle = findAngleFromCoor({ coor: { x, y }, center });
        if (startRef.current) {
          const startAngle = startRef.current.degrees;
          const endAngleIsNearStartAngle = inRange(
            endAngle,
            startAngle - ANGLE_DELTA_THRESHOLD_IN_DEGREES,
            startAngle + ANGLE_DELTA_THRESHOLD_IN_DEGREES,
          );
          if (endAngleIsNearStartAngle) {
            setDirection(null);
          }
        }
        setEnd({
          degrees: endAngle,
          center,
        });
      }
    },
    [ref, setDirection, setEnd, startRef],
  );

  useEffect(
    function determineDirection() {
      if (start && end && direction === null) {
        const startAngle = start.degrees;
        const endAngle = end.degrees;
        const delta = endAngle - startAngle;
        const guessedDirection = delta > 0 ? "clockwise" : "counterclockwise";
        setDirection(guessedDirection);
      }
    },
    [direction, end, setDirection, start],
  );

  useEffect(
    function handleEventListeners() {
      const node = ref.current;
      if (node) {
        node.addEventListener("mousedown", onMouseDown);
        node.addEventListener("mousemove", onMouseMove);
        node.addEventListener("mouseup", onMouseUp);
      }
      if (typeof window !== "undefined") {
        window.addEventListener("mouseup", onMouseUp);
      }

      return () => {
        node?.removeEventListener("mousedown", onMouseDown);
        node?.removeEventListener("mousemove", onMouseMove);
        node?.removeEventListener("mouseup", onMouseUp);
        window?.removeEventListener("mouseup", onMouseUp);
      };
    },
    [onMouseDown, onMouseMove, onMouseUp, ref],
  );
  return { start, end, direction };
};
