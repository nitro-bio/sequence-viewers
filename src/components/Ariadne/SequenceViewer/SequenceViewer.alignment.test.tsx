import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { loadAioli } from "@utils/loadAioli";
import { SequenceViewer } from "./SequenceViewer";

import type Aioli from "@biowasm/aioli";

vi.mock("@utils/loadAioli", () => ({
  loadAioli: vi.fn(),
}));

const mockedLoadAioli = vi.mocked(loadAioli);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const makeClient = () => {
  let mountedFasta = "";
  const client = {
    write: vi.fn(async ({ buffer }: { path: string; buffer: Uint8Array }) => {
      mountedFasta = new TextDecoder().decode(buffer);
    }),
    exec: vi.fn(async (command: string) => {
      if (!command.startsWith("cat ")) return "";
      const ids = [...mountedFasta.matchAll(/^>(.+)$/gm)].map(
        (match) => match[1],
      );
      return `>${ids[0]}\nACG\n>${ids[1]}\nA-G\n`;
    }),
    fs: {
      readdir: vi.fn(async () => [] as string[]),
      unlink: vi.fn(async (path: string) => void path),
      stat: vi.fn(async (path: string) => ({ path })),
    },
    getMountedFasta: () => mountedFasta,
  };
  return client;
};

const installClient = (client: ReturnType<typeof makeClient>) => {
  const AioliConstructor = vi.fn(function () {
    return Promise.resolve(client);
  }) as unknown as typeof Aioli;
  mockedLoadAioli.mockResolvedValue(AioliConstructor);
  return AioliConstructor;
};

const viewerProps = {
  sequences: ["ACG", "AG"],
  annotations: [],
  selection: null,
  setSelection: vi.fn(),
  charClassName: () => "",
  hideDownloadButton: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("alignment is explicitly opted in and stays lazy while disabled", () => {
  render(<SequenceViewer {...viewerProps} setSequences={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Align" })).toBeNull();
  expect(mockedLoadAioli).not.toHaveBeenCalled();
});

test("enabled alignment without an update callback explains why it is disabled", () => {
  render(<SequenceViewer {...viewerProps} enableAlignment />);

  expect(
    (screen.getByRole("button", { name: "Align" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    screen.getByText("Provide setSequences to apply an alignment."),
  ).not.toBeNull();
  expect(mockedLoadAioli).not.toHaveBeenCalled();
});

test.each([[[]], [[""]]])(
  "empty sequences expose no alignment action",
  (sequences) => {
    render(
      <SequenceViewer
        {...viewerProps}
        sequences={sequences}
        setSequences={vi.fn()}
        enableAlignment
      />,
    );

    expect(screen.queryByRole("button", { name: "Align" })).toBeNull();
    expect(mockedLoadAioli).not.toHaveBeenCalled();
  },
);

test("an alignment failure is announced and can be retried", async () => {
  const client = makeClient();
  let shouldFail = true;
  client.exec.mockImplementation(async (command) => {
    if (command.startsWith("tbfast") && shouldFail) {
      shouldFail = false;
      throw new Error("tool failed");
    }
    if (!command.startsWith("cat ")) return "";
    const ids = [...client.getMountedFasta().matchAll(/^>(.+)$/gm)].map(
      (match) => match[1],
    );
    return `>${ids[0]}\nACG\n>${ids[1]}\nA-G\n`;
  });
  installClient(client);
  const setSequences = vi.fn();
  render(
    <SequenceViewer
      {...viewerProps}
      setSequences={setSequences}
      enableAlignment
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Align" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Alignment failed",
  );

  fireEvent.click(screen.getByRole("button", { name: "Retry alignment" }));
  await waitFor(() =>
    expect(setSequences).toHaveBeenCalledWith(["ACG", "A-G"]),
  );
  expect(setSequences).toHaveBeenCalledOnce();
});

test("completion is applied after the metadata bar is hidden", async () => {
  const output = deferred<string>();
  const client = makeClient();
  client.exec.mockImplementation(async (command) => {
    if (!command.startsWith("cat ")) return "";
    return output.promise;
  });
  installClient(client);
  const setSequences = vi.fn();
  const { rerender } = render(
    <SequenceViewer
      {...viewerProps}
      setSequences={setSequences}
      enableAlignment
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Align" }));
  await waitFor(() => expect(client.exec).toHaveBeenCalledTimes(3));
  rerender(
    <SequenceViewer
      {...viewerProps}
      setSequences={setSequences}
      enableAlignment
      hideMetadataBar
    />,
  );
  const ids = [...client.getMountedFasta().matchAll(/^>(.+)$/gm)].map(
    (match) => match[1],
  );
  output.resolve(`>${ids[1]}\na-g\n>${ids[0]}\nacg\n`);

  await act(async () => undefined);
  await waitFor(() =>
    expect(setSequences).toHaveBeenCalledWith(["ACG", "A-G"]),
  );
  expect(setSequences).toHaveBeenCalledOnce();
});
