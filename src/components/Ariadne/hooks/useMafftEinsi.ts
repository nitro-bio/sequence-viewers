import { useCallback, useEffect, useRef, useState } from "react";
import { loadAioli } from "@utils/loadAioli";

import type { Aioli as AioliClient } from "@biowasm/aioli";

export type AlignState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done" }
  | {
      status: "error";
      error: unknown;
      recovery: "retry" | "change-input" | "remount";
    };

export interface AlignmentConfig {
  urlCDN?: string;
  debug?: boolean;
}

interface UseMafftEinsiOptions {
  sequences: string[];
  onAligned?: (sequences: string[]) => void;
  config?: AlignmentConfig;
  enabled?: boolean;
}

interface UseMafftEinsi {
  state: AlignState;
  run: () => Promise<void>;
}

interface CachedClient {
  configKey: string;
  promise: Promise<AioliClient>;
}

const DATA_DIRECTORY = "/shared/data";
const MAFFT_VERSION = "7.520";
const COREUTILS_VERSION = "8.32";

const MAFFT_TOOLS = [
  {
    tool: "coreutils",
    version: COREUTILS_VERSION,
    program: "cat",
    reinit: false,
  },
  {
    tool: "mafft",
    version: MAFFT_VERSION,
    program: "tbfast",
    loading: "lazy",
    reinit: true,
  },
  {
    tool: "mafft",
    version: MAFFT_VERSION,
    program: "dvtditr",
    loading: "lazy",
    reinit: false,
  },
] as const;

const sequencesAreEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((sequence, index) => sequence === right[index]);

const makeConfigKey = ({ urlCDN, debug = false }: AlignmentConfig) =>
  `${urlCDN ?? ""}\u0000${debug}`;

const CONFIGURATION_CHANGED_ERROR = new Error(
  "Alignment configuration changed after initialization.",
);
const INVALID_INPUT_ERROR = new Error(
  "Alignment input cannot contain FASTA headers or line breaks.",
);

const makeFasta = (sequences: string[], recordIds: string[]) =>
  sequences
    .map((sequence, index) => `>${recordIds[index]}\n${sequence}`)
    .join("\n");

export const parseMafftOutput = (
  output: string,
  recordIds: string[],
  inputSequences: string[],
) => {
  if (recordIds.length !== inputSequences.length) {
    throw new Error("Alignment input records are inconsistent.");
  }
  const records = new Map<string, string>();
  let activeId: string | undefined;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith(">")) {
      const id = line.slice(1).trim();
      if (!recordIds.includes(id) || records.has(id)) {
        throw new Error("Alignment returned an unexpected sequence record.");
      }
      records.set(id, "");
      activeId = id;
      continue;
    }

    if (!activeId || /\s/.test(line)) {
      throw new Error("Alignment returned malformed FASTA output.");
    }
    records.set(activeId, `${records.get(activeId)}${line}`);
  }

  const alignedSequences = recordIds.map((id) => records.get(id));
  if (
    alignedSequences.some((sequence) => !sequence) ||
    new Set(alignedSequences.map((sequence) => sequence?.length)).size !== 1
  ) {
    throw new Error("Alignment returned incomplete sequence records.");
  }

  return alignedSequences.map((sequence, index) => {
    const normalizedOutput = sequence!.replaceAll("-", "").toUpperCase();
    const normalizedInput = inputSequences[index]
      .replaceAll("-", "")
      .toUpperCase();
    if (normalizedOutput !== normalizedInput) {
      throw new Error("Alignment changed or reassociated sequence residues.");
    }
    return sequence!.toUpperCase();
  });
};

const removeNewFiles = async (cli: AioliClient, filesBefore: Set<string>) => {
  let filesAfter: string[];
  try {
    filesAfter = await cli.fs.readdir(DATA_DIRECTORY);
  } catch {
    return;
  }

  await Promise.all(
    filesAfter
      .filter((fileName) => !filesBefore.has(fileName))
      .map(async (fileName) => {
        try {
          await cli.fs.unlink(`${DATA_DIRECTORY}/${fileName}`);
        } catch {
          // Aioli has no worker teardown API. Its documented virtual filesystem
          // API is the supported way to release files created by an operation.
        }
      }),
  );
};

/** Run MAFFT E-INS-i in a lazily-created browser worker. */
export function useMafftEinsi({
  sequences,
  onAligned,
  config = {},
  enabled = true,
}: UseMafftEinsiOptions): UseMafftEinsi {
  const [state, setState] = useState<AlignState>({ status: "idle" });
  const mountedRef = useRef(false);
  const runningRef = useRef(false);
  const operationRef = useRef(0);
  const lifecycleRevisionRef = useRef(0);
  const clientRef = useRef<CachedClient>();
  const sequencesRef = useRef([...sequences]);
  const onAlignedRef = useRef(onAligned);
  const configRef = useRef<AlignmentConfig>({ ...config });
  const enabledRef = useRef(enabled);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!sequencesAreEqual(sequencesRef.current, sequences)) {
      sequencesRef.current = [...sequences];
      lifecycleRevisionRef.current += 1;
      setState((current) =>
        current.status === "running" || current.status === "idle"
          ? current
          : { status: "idle" },
      );
    }
  }, [sequences]);

  useEffect(() => {
    if (makeConfigKey(configRef.current) !== makeConfigKey(config)) {
      configRef.current = { ...config };
      lifecycleRevisionRef.current += 1;
      setState((current) =>
        current.status === "running" || current.status === "idle"
          ? current
          : { status: "idle" },
      );
    }
  }, [config]);

  useEffect(() => {
    if (enabledRef.current !== enabled) {
      enabledRef.current = enabled;
      lifecycleRevisionRef.current += 1;
      setState((current) =>
        current.status === "running" || current.status === "idle"
          ? current
          : { status: "idle" },
      );
    }
  }, [enabled]);

  useEffect(() => {
    onAlignedRef.current = onAligned;
  }, [onAligned]);

  const run = useCallback(async () => {
    if (runningRef.current || !enabledRef.current || !onAlignedRef.current)
      return;

    const inputSequences = [...sequencesRef.current];
    if (
      inputSequences.length === 0 ||
      inputSequences.some((sequence) => sequence.length === 0)
    ) {
      return;
    }
    if (inputSequences.some((sequence) => /[\r\n>]/.test(sequence))) {
      if (mountedRef.current) {
        setState({
          status: "error",
          error: INVALID_INPUT_ERROR,
          recovery: "change-input",
        });
      }
      return;
    }

    const operation = operationRef.current + 1;
    const lifecycleRevision = lifecycleRevisionRef.current;
    const operationConfig = { ...configRef.current };
    const configKey = makeConfigKey(operationConfig);
    if (clientRef.current && clientRef.current.configKey !== configKey) {
      if (mountedRef.current) {
        setState({
          status: "error",
          error: CONFIGURATION_CHANGED_ERROR,
          recovery: "remount",
        });
      }
      return;
    }

    runningRef.current = true;
    operationRef.current = operation;
    const recordIds = inputSequences.map(
      (_, index) => `nsv_alignment_${operation}_${index}`,
    );
    const fileName = `nsv-mafft-einsi-${operation}.fa`;

    if (mountedRef.current) setState({ status: "running" });

    let alignedSequences: string[];
    let cli: AioliClient | undefined;
    let filesBefore = new Set<string>();
    try {
      if (!clientRef.current) {
        const promise = loadAioli().then((AioliConstructor) => {
          const aioliConfig = {
            debug: operationConfig.debug ?? false,
            ...(operationConfig.urlCDN
              ? { urlCDN: operationConfig.urlCDN }
              : {}),
          };
          return new AioliConstructor(MAFFT_TOOLS, aioliConfig);
        });
        clientRef.current = { configKey, promise };
      }

      const cachedClient = clientRef.current;
      try {
        cli = await cachedClient.promise;
      } catch (error) {
        if (clientRef.current === cachedClient) clientRef.current = undefined;
        throw error;
      }

      try {
        filesBefore = new Set(await cli.fs.readdir(DATA_DIRECTORY));
      } catch {
        filesBefore = new Set();
      }
      await cli.write({
        path: `${DATA_DIRECTORY}/${fileName}`,
        buffer: new TextEncoder().encode(makeFasta(inputSequences, recordIds)),
      });

      await cli.exec(
        "tbfast _ -u 0.0 -l 2.7 -C 0 -b 62 -g 0.0 -f -2.00 -Q 100.0 " +
          "-h 0.0 -O -6.00 -E -0.000 -N -Z _ -+ 16 -W 0.00001 -V -1.53 " +
          "-s 0.0 -O -C 0 -b 62 -f -1.53 -Q 100.0 -h 0.000 -l 2.7 " +
          `-X 0.1 -i ${fileName}`,
      );
      await cli.exec(
        "dvtditr -W 0.00001 -E 0.0 -s 0.0 -C 0 -t 0 -F -l 2.7 -z 50 " +
          "-b 62 -f -1.53 -Q 100.0 -h 0.000 -I 16 -X 0.1 -p BAATARI2 " +
          "-K 0 -i /shared/data/pre",
      );

      const output = await cli.exec("cat /shared/data/pre");
      alignedSequences = parseMafftOutput(output, recordIds, inputSequences);
    } catch (error) {
      if (mountedRef.current && operationRef.current === operation) {
        setState(
          lifecycleRevisionRef.current === lifecycleRevision &&
            enabledRef.current
            ? { status: "error", error, recovery: "retry" }
            : { status: "idle" },
        );
      }
      return;
    } finally {
      if (cli) await removeNewFiles(cli, filesBefore);
      runningRef.current = false;
    }

    const isCurrent =
      mountedRef.current &&
      operationRef.current === operation &&
      lifecycleRevisionRef.current === lifecycleRevision &&
      enabledRef.current &&
      makeConfigKey(configRef.current) === configKey;
    if (!isCurrent) {
      if (mountedRef.current && operationRef.current === operation) {
        setState({ status: "idle" });
      }
      return;
    }

    setState({ status: "done" });
    onAlignedRef.current?.(alignedSequences);
  }, []);

  return { state, run };
}
