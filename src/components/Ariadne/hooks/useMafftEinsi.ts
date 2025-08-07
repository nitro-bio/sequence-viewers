import { useState, useCallback } from "react";
import { loadAioli } from "@utils/loadAioli";

type AlignState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; output: string }
  | { status: "error"; error: unknown };

interface UseMafftEinsi {
  state: AlignState;
  run: (fasta: string) => Promise<void>;
}

/**
 * React hook that runs MAFFT E-INS-i (tbfast + dvtditr) in the browser,
 * exactly like the snippet you posted.
 */
export function useMafftEinsi(): UseMafftEinsi {
  const [state, setState] = useState<AlignState>({ status: "idle" });

  const run = useCallback(async (fasta: string) => {
    setState({ status: "running" });

    try {
      const version = "7.520";
      const Aioli = await loadAioli();
      const CLI = await new Aioli(
        [
          "coreutils/echo/8.32",
          "coreutils/ls/8.32",
          "coreutils/cat/8.32",
          { tool: "mafft", version, program: "tbfast", reinit: true },
          { tool: "mafft", version, program: "dvtditr", reinit: false },
        ],
        { debug: process.env.NODE_ENV === "development" },
      );

      const uniqueId = crypto.randomUUID();
      const fileName = `mafft-einsi-${uniqueId}.fa`;
      console.log(`Generated unique file name: ${fileName}`);
      await CLI.mount({ name: fileName, data: fasta });

      await CLI.exec(
        "tbfast _ -u 0.0 -l 2.7 -C 0 -b 62 -g 0.0 -f -2.00 -Q 100.0 " +
          "-h 0.0 -O -6.00 -E -0.000 -N -Z _ -+ 16 -W 0.00001 -V -1.53 " +
          "-s 0.0 -O -C 0 -b 62 -f -1.53 -Q 100.0 -h 0.000 -l 2.7 " +
          `-X 0.1 -i ${fileName}`,
      );
      await CLI.exec(
        "dvtditr -W 0.00001 -E 0.0 -s 0.0 -C 0 -t 0 -F -l 2.7 -z 50 " +
          "-b 62 -f -1.53 -Q 100.0 -h 0.000 -I 16 -X 0.1 -p BAATARI2 " +
          "-K 0 -i /shared/data/pre",
      );

      const output = await CLI.exec("cat /shared/data/pre");
      setState({ status: "done", output });
    } catch (err) {
      console.error(err);
      setState({ status: "error", error: err });
    }
  }, []);

  return { state, run };
}
