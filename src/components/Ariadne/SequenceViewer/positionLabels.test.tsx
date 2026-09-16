import { fireEvent, render, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { expect, test, vi } from "vitest";
import { SequenceViewer } from "./SequenceViewer";
import { useState } from "react";
import {
  AdaptivePositionLabel,
  MinimalPositionLabel,
  type PositionLabelProps,
} from ".";

test("custom labels replace the index ruler and remain presentation-only", () => {
  const setSelection = vi.fn();
  const props = {
    sequences: ["A-TG"],
    selection: null,
    setSelection,
    charClassName: () => "",
    hideMetadataBar: true,
  };
  const labels = ["35", "35a", null, "52b", "extra"] as const;
  const { container, rerender, queryByText, getByText } = render(
    <SequenceViewer {...props} />,
  );
  expect(getByText("| 0")).toBeInTheDocument();
  expect(container.querySelector(".nsv-position-slot")).toBeNull();

  rerender(<SequenceViewer {...props} positionLabels={labels} />);
  expect(
    container
      .querySelector(".nsv-position-content")
      ?.getAttribute("data-position-label-preset"),
  ).toBe("minimal");
  expect(queryByText("| 0")).toBeNull();
  expect(queryByText("extra")).toBeNull();
  expect(container.querySelectorAll(".nsv-position-slot")).toHaveLength(4);
  const gapColumn = container.querySelector('[data-sequence-column="1"]')!;
  expect(within(gapColumn as HTMLElement).getByText("35a")).toBeInTheDocument();
  fireEvent.mouseDown(within(gapColumn as HTMLElement).getByText("-"));
  expect(setSelection).toHaveBeenLastCalledWith({
    start: 1,
    end: 1,
    direction: "forward",
  });

  rerender(<SequenceViewer {...props} positionLabels={["updated"]} />);
  expect(queryByText("35a")).toBeNull();
  expect(container.querySelectorAll(".nsv-position-slot")).toHaveLength(4);
  expect(container.querySelectorAll(".nsv-position-label")).toHaveLength(1);

  rerender(<SequenceViewer {...props} positionLabels={[]} />);
  expect(queryByText("| 0")).toBeNull();
  expect(container.querySelectorAll(".nsv-position-label")).toHaveLength(0);

  rerender(<SequenceViewer {...props} />);
  expect(getByText("| 0")).toBeInTheDocument();
  expect(container.querySelector(".nsv-position-slot")).toBeNull();
});

test("ruler columns follow the longest sequence and refresh with aligned input", () => {
  const props = {
    selection: null,
    setSelection: vi.fn(),
    charClassName: () => "",
    hideMetadataBar: true,
  };
  const { container, rerender } = render(
    <SequenceViewer
      {...props}
      sequences={["AC", "ACTG"]}
      positionLabels={["1", "2", "3", "4"]}
    />,
  );
  expect(container.querySelectorAll(".nsv-position-slot")).toHaveLength(4);
  rerender(
    <SequenceViewer
      {...props}
      sequences={["A-C", "ATC"]}
      positionLabels={["1", null, "2"]}
    />,
  );
  expect(container.querySelectorAll(".nsv-position-slot")).toHaveLength(3);
  expect(
    Array.from(
      container.querySelectorAll(".nsv-position-label"),
      (label) => label.textContent,
    ),
  ).toEqual(["| 1", "| 2"]);
});

test("packaged renderers and their named presets select the same layouts", () => {
  const props = {
    sequences: ["ACT"],
    positionLabels: ["35", "35a", "36"],
    selection: null,
    setSelection: vi.fn(),
    charClassName: () => "",
    hideMetadataBar: true,
  };
  const { container, rerender, getByText } = render(
    <SequenceViewer {...props} positionLabelRenderer={AdaptivePositionLabel} />,
  );
  expect(getByText("35a")).toBeInTheDocument();
  expect(
    container
      .querySelector(".nsv-position-content")
      ?.getAttribute("data-position-label-preset"),
  ).toBe("adaptive");
  rerender(
    <SequenceViewer {...props} positionLabelRenderer={MinimalPositionLabel} />,
  );
  expect(getByText("35a")).toBeInTheDocument();
  expect(
    container
      .querySelector(".nsv-position-content")
      ?.getAttribute("data-position-label-preset"),
  ).toBe("minimal");
  rerender(<SequenceViewer {...props} positionLabelRenderer="adaptive" />);
  expect(getByText("35a")).toBeInTheDocument();
  rerender(<SequenceViewer {...props} positionLabelRenderer="minimal" />);
  expect(getByText("35a")).toBeInTheDocument();
  rerender(
    <SequenceViewer
      {...props}
      positionLabels={undefined}
      positionLabelRenderer={AdaptivePositionLabel}
    />,
  );
  expect(getByText("0")).toBeInTheDocument();
});

test("custom renderer components retain state and receive live column context", () => {
  const Label = ({
    label,
    columnIndex,
    isSelected,
    isHovered,
  }: PositionLabelProps) => {
    const [clicks, setClicks] = useState(0);
    return (
      <button
        onClick={() => setClicks(clicks + 1)}
        data-selected={isSelected}
        data-hovered={isHovered}
      >
        {label} / {columnIndex} / {clicks}
      </button>
    );
  };
  const props = {
    sequences: ["A-TG"],
    positionLabels: ["35", null, "35a"],
    setSelection: vi.fn(),
    charClassName: () => "",
    hideMetadataBar: true,
    positionLabelRenderer: Label,
  };
  const { container, rerender, getByRole } = render(
    <SequenceViewer {...props} selection={null} />,
  );
  expect(container.querySelectorAll(".nsv-position-label")).toHaveLength(2);
  fireEvent.click(getByRole("button", { name: "35a / 2 / 0" }));
  rerender(
    <SequenceViewer
      {...props}
      selection={{ start: 2, end: 2, direction: "forward" }}
    />,
  );
  const label = getByRole("button", { name: "35a / 2 / 1" });
  expect(label.getAttribute("data-selected")).toBe("true");
  fireEvent.mouseEnter(
    within(
      container.querySelector('[data-sequence-column="2"]') as HTMLElement,
    ).getByText("T"),
  );
  expect(label.getAttribute("data-hovered")).toBe("true");
  expect(props.setSelection).not.toHaveBeenCalled();
});
