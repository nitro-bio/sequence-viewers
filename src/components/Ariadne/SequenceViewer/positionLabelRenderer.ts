import {
  AdaptivePositionLabel,
  MinimalPositionLabel,
  type PositionLabelRenderer,
} from "./PositionLabel";
export type { PositionLabelRenderer } from "./PositionLabel";

export function resolvePositionLabelRenderer(
  renderer: PositionLabelRenderer = "minimal",
) {
  if (renderer === "minimal") return MinimalPositionLabel;
  if (renderer === "adaptive") return AdaptivePositionLabel;
  return renderer;
}

export function isMinimalPositionLabelRenderer(
  renderer?: PositionLabelRenderer,
) {
  return (
    renderer === undefined ||
    renderer === "minimal" ||
    renderer === MinimalPositionLabel
  );
}

export function isCustomPositionLabelRenderer(
  renderer?: PositionLabelRenderer,
) {
  return (
    renderer !== undefined &&
    typeof renderer !== "string" &&
    renderer !== MinimalPositionLabel &&
    renderer !== AdaptivePositionLabel
  );
}
