export type RunArgs = {
  filePath: string;
  tideCount?: number;
};

export class UsageFault extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "UsageFault";
  }
}

const USAGE = "usage: silttrap run <sluice> [--tides N]";

/** Read `silttrap run <sluice> [--tides N]` from argv, without the node binary. */
export function parseArgs(argv: string[]): RunArgs {
  if (argv.length === 0) {
    throw new UsageFault(`missing command\n${USAGE}`);
  }
  if (argv[0] !== "run") {
    throw new UsageFault(`unknown command ${JSON.stringify(argv[0])}\n${USAGE}`);
  }

  let filePath: string | undefined;
  let tideCount: number | undefined;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--tides") {
      const raw = argv[i + 1];
      if (raw === undefined) {
        throw new UsageFault(`--tides needs a positive integer\n${USAGE}`);
      }
      i += 1;
      tideCount = readCount(tideCount, raw);
      continue;
    }
    if (arg.startsWith("--tides=")) {
      tideCount = readCount(tideCount, arg.slice("--tides=".length));
      continue;
    }
    if (arg.startsWith("-")) {
      throw new UsageFault(`unknown option ${JSON.stringify(arg)}\n${USAGE}`);
    }
    if (filePath !== undefined) {
      throw new UsageFault(`unexpected argument ${JSON.stringify(arg)}\n${USAGE}`);
    }
    filePath = arg;
  }

  if (filePath === undefined) {
    throw new UsageFault(`missing sluice file\n${USAGE}`);
  }
  return tideCount === undefined ? { filePath } : { filePath, tideCount };
}

function readCount(already: number | undefined, raw: string): number {
  if (already !== undefined) {
    throw new UsageFault(`--tides was given twice\n${USAGE}`);
  }
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new UsageFault(
      `--tides must be a positive integer, got ${JSON.stringify(raw)}\n${USAGE}`,
    );
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new UsageFault(
      `--tides must be a positive integer, got ${JSON.stringify(raw)}\n${USAGE}`,
    );
  }
  return value;
}
