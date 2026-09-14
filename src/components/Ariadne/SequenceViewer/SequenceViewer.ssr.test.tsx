// @vitest-environment node

import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { SequenceViewer } from "./SequenceViewer";

vi.mock("../hooks/useMafftEinsi", () => ({
  useMafftEinsi: () => ({
    state: { status: "idle" },
    run: vi.fn(async () => {}),
  }),
}));

test("server-renders a bounded residue window with selection semantics", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const html = renderToString(
    <SequenceViewer
      sequences={["A".repeat(100_000)]}
      selection={{ start: 2, end: 4, direction: "forward" }}
      hideMetadataBar
    />,
  );

  const renderedResidues = html.match(/data-sequence-position=/g) ?? [];
  const serverWarnings = consoleError.mock.calls.flat().join("\n");
  consoleError.mockRestore();

  expect(renderedResidues.length).toBeGreaterThan(0);
  expect(renderedResidues.length).toBeLessThan(1_000);
  expect(html.match(/nsv-sequence-selection/g) ?? []).toHaveLength(3);
  expect(serverWarnings).not.toContain(
    "useLayoutEffect does nothing on the server",
  );
});
