import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { loadAioli } from "@utils/loadAioli";
import { parseMafftOutput, useMafftEinsi } from "./useMafftEinsi";

import type Aioli from "@biowasm/aioli";

vi.mock("@utils/loadAioli", () => ({
  loadAioli: vi.fn(),
}));

const mockedLoadAioli = vi.mocked(loadAioli);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const outputForMountedFasta = (fasta: string) => {
  const recordIds = [...fasta.matchAll(/^>(.+)$/gm)].map((match) => match[1]);
  return `>${recordIds[1]}\na-g\n>${recordIds[0]}\nacg\n`;
};

const makeClient = (exec: (command: string) => Promise<string>) => {
  let mountedFasta = "";
  const client = {
    write: vi.fn(async ({ buffer }: { path: string; buffer: Uint8Array }) => {
      mountedFasta = new TextDecoder().decode(buffer);
    }),
    exec: vi.fn(exec),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseMafftOutput", () => {
  test("restores input order from generated record identifiers", () => {
    expect(
      parseMafftOutput(
        ">record-2\na-g\n>record-1\nacg\n",
        ["record-1", "record-2"],
        ["acg", "ag"],
      ),
    ).toEqual(["ACG", "A-G"]);
  });

  test.each([
    [">record-1\nACG\n", "missing record"],
    [">unknown\nACG\n>record-2\nA-G\n", "unknown record"],
    [">record-1\nACG\n>record-2\nAG\n", "unequal lengths"],
    ["ACG\n>record-1\nACG\n>record-2\nA-G\n", "sequence before header"],
  ])("rejects %s (%s)", (output) => {
    expect(() =>
      parseMafftOutput(output, ["record-1", "record-2"], ["ACG", "AG"]),
    ).toThrow(/Alignment returned/);
  });

  test("rejects changed residues and records associated with the wrong ID", () => {
    expect(() =>
      parseMafftOutput(
        ">record-1\nA-G\n>record-2\nACG\n",
        ["record-1", "record-2"],
        ["ACG", "AG"],
      ),
    ).toThrow(/changed or reassociated/);
  });
});

describe("useMafftEinsi", () => {
  test("forwards self-hosting configuration and lazily loads only required tools", async () => {
    const client = makeClient(async (command) =>
      command.startsWith("cat ")
        ? outputForMountedFasta(client.getMountedFasta())
        : "",
    );
    const AioliConstructor = installClient(client);
    const onAligned = vi.fn();
    const { result } = renderHook(() =>
      useMafftEinsi({
        sequences: ["acg", "ag"],
        onAligned,
        config: { urlCDN: "https://assets.example.test/biowasm", debug: true },
      }),
    );

    expect(mockedLoadAioli).not.toHaveBeenCalled();
    await act(async () => result.current.run());

    expect(AioliConstructor).toHaveBeenCalledWith(
      [
        {
          tool: "coreutils",
          version: "8.32",
          program: "cat",
          reinit: false,
        },
        {
          tool: "mafft",
          version: "7.520",
          program: "tbfast",
          loading: "lazy",
          reinit: true,
        },
        {
          tool: "mafft",
          version: "7.520",
          program: "dvtditr",
          loading: "lazy",
          reinit: false,
        },
      ],
      { urlCDN: "https://assets.example.test/biowasm", debug: true },
    );
    expect(onAligned).toHaveBeenCalledOnce();
    expect(onAligned).toHaveBeenCalledWith(["ACG", "A-G"]);
  });

  test("defaults Aioli debugging off and removes files created by the run", async () => {
    const client = makeClient(async (command) =>
      command.startsWith("cat ")
        ? outputForMountedFasta(client.getMountedFasta())
        : "",
    );
    client.fs.readdir
      .mockResolvedValueOnce([".", "..", "existing.txt"])
      .mockResolvedValueOnce([
        ".",
        "..",
        "existing.txt",
        "nsv-mafft-einsi-1.fa",
        "pre",
      ]);
    const AioliConstructor = installClient(client);
    const { result } = renderHook(() =>
      useMafftEinsi({ sequences: ["acg", "ag"], onAligned: vi.fn() }),
    );

    await act(async () => result.current.run());

    expect(AioliConstructor).toHaveBeenCalledWith(expect.any(Array), {
      debug: false,
    });
    expect(client.fs.unlink.mock.calls.map(([path]) => path).sort()).toEqual([
      "/shared/data/nsv-mafft-einsi-1.fa",
      "/shared/data/pre",
    ]);
  });

  test("uses the latest callback once when its identity changes during a run", async () => {
    const output = deferred<string>();
    const client = makeClient(async (command) => {
      if (command.startsWith("cat ")) return output.promise;
      return "";
    });
    installClient(client);
    const firstCallback = vi.fn();
    const latestCallback = vi.fn();
    const { result, rerender } = renderHook(
      ({ onAligned }) => useMafftEinsi({ sequences: ["acg", "ag"], onAligned }),
      { initialProps: { onAligned: firstCallback } },
    );

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run();
    });
    await waitFor(() => expect(client.exec).toHaveBeenCalledTimes(3));
    rerender({ onAligned: latestCallback });
    output.resolve(outputForMountedFasta(client.getMountedFasta()));
    await act(async () => runPromise);

    expect(firstCallback).not.toHaveBeenCalled();
    expect(latestCallback).toHaveBeenCalledOnce();
  });

  test("does not apply a result after the input changes", async () => {
    const output = deferred<string>();
    const client = makeClient(async (command) => {
      if (command.startsWith("cat ")) return output.promise;
      return "";
    });
    installClient(client);
    const onAligned = vi.fn();
    const { result, rerender } = renderHook(
      ({ sequences }) => useMafftEinsi({ sequences, onAligned }),
      { initialProps: { sequences: ["acg", "ag"] } },
    );

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run();
    });
    await waitFor(() => expect(client.exec).toHaveBeenCalledTimes(3));
    rerender({ sequences: ["changed", "input"] });
    output.resolve(outputForMountedFasta(client.getMountedFasta()));
    await act(async () => runPromise);

    expect(onAligned).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("idle");
  });

  test("does not resurrect a result after the input changes away and back", async () => {
    const output = deferred<string>();
    const client = makeClient(async (command) => {
      if (command.startsWith("cat ")) return output.promise;
      return "";
    });
    installClient(client);
    const onAligned = vi.fn();
    const { result, rerender } = renderHook(
      ({ sequences }) => useMafftEinsi({ sequences, onAligned }),
      { initialProps: { sequences: ["acg", "ag"] } },
    );

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run();
    });
    await waitFor(() => expect(client.exec).toHaveBeenCalledTimes(3));
    rerender({ sequences: ["changed", "input"] });
    rerender({ sequences: ["acg", "ag"] });
    output.resolve(outputForMountedFasta(client.getMountedFasta()));
    await act(async () => runPromise);

    expect(onAligned).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("idle");
  });

  test("guards duplicate runs and ignores completion after unmount", async () => {
    const output = deferred<string>();
    const client = makeClient(async (command) => {
      if (command.startsWith("cat ")) return output.promise;
      return "";
    });
    installClient(client);
    const onAligned = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMafftEinsi({ sequences: ["acg", "ag"], onAligned }),
    );

    let firstRun!: Promise<void>;
    let duplicateRun!: Promise<void>;
    act(() => {
      firstRun = result.current.run();
      duplicateRun = result.current.run();
    });
    await duplicateRun;
    await waitFor(() => expect(client.exec).toHaveBeenCalledTimes(3));
    expect(mockedLoadAioli).toHaveBeenCalledOnce();

    unmount();
    output.resolve(outputForMountedFasta(client.getMountedFasta()));
    await firstRun;
    expect(onAligned).not.toHaveBeenCalled();
  });

  test("does not classify a consumer callback exception as an alignment error", async () => {
    const client = makeClient(async (command) =>
      command.startsWith("cat ")
        ? outputForMountedFasta(client.getMountedFasta())
        : "",
    );
    installClient(client);
    const callbackError = new Error("consumer callback failed");
    const { result } = renderHook(() =>
      useMafftEinsi({
        sequences: ["acg", "ag"],
        onAligned: () => {
          throw callbackError;
        },
      }),
    );

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.run();
      } catch (error) {
        caughtError = error;
      }
    });
    expect(caughtError).toBe(callbackError);
    expect(result.current.state.status).toBe("done");
  });
});
