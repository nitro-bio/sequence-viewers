import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { expect, test, vi } from "vitest";
import { CircularViewer } from "./CircularViewer";
import { LinearViewer } from "./LinearViewer";
import { SequenceViewer } from "./SequenceViewer";
import { getAnnotatedSequence } from "@Ariadne/utils";

vi.mock("@Ariadne/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return {
    ...actual,
    getAnnotatedSequence: vi.fn(actual.getAnnotatedSequence),
  };
});

// Browser output cannot tell whether a streaming parent needlessly regenerated
// every base. Keep this one targeted performance regression at component level.
test("streaming rerenders reuse bases until sequence data changes", () => {
  const callbacks = { selection: null, setSelection: vi.fn() };
  const element = (sequences: string[]) => (
    <StrictMode>
      <SequenceViewer
        sequences={sequences}
        annotations={[]}
        charClassName={() => ""}
        hideMetadataBar
        {...callbacks}
      />
      <LinearViewer sequences={sequences} annotations={[]} {...callbacks} />
      <CircularViewer sequence={sequences[0]} annotations={[]} {...callbacks} />
    </StrictMode>
  );
  const sequences = ["ACGT"];
  const { rerender } = render(element(sequences));
  const initialCalls = vi.mocked(getAnnotatedSequence).mock.calls.length;
  expect(initialCalls).toBeGreaterThan(0);
  rerender(element(sequences));
  expect(getAnnotatedSequence).toHaveBeenCalledTimes(initialCalls);
  rerender(element(["ACGTACGT"]));
  expect(vi.mocked(getAnnotatedSequence).mock.calls.length).toBeGreaterThan(
    initialCalls,
  );
});
