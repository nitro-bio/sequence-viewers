import type { ComponentType } from "react";

export interface PositionLabelProps {
  label: string;
  /** Zero-based aligned column, independent of the displayed label. */
  columnIndex: number;
  isSelected: boolean;
  isHovered: boolean;
}

/** Custom components use the adaptive geometry and are mounted as React components. */
export type PositionLabelRenderer =
  | "minimal"
  | "adaptive"
  | ComponentType<PositionLabelProps>;

export function MinimalPositionLabel({ label }: PositionLabelProps) {
  return (
    <span className="nsv-position-minimal-text">
      <span className="nsv-position-minimal-marker" aria-hidden="true">
        |{" "}
      </span>
      {label}
    </span>
  );
}

export function AdaptivePositionLabel({ label }: PositionLabelProps) {
  return <>{label}</>;
}
