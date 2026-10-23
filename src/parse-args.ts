export type RunArgs = {
  filePath: string;
  tideCount?: number;
  wash?: number;
  rise?: number;
};

export class UsageFault extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "UsageFault";
  }
}

const USAGE = "usage: silttrap run <sluice> [--tides N] [--wash N] [--rise R]";

/** Read `silttrap run <sluice> [--tides N] [--wash N] [--rise R]` from argv, without the node binary. */
export function parseArgs(argv: string[]): RunArgs {
  if (argv.length === 0) {
    throw new UsageFault(`missing command\n${USAGE}`);
  }
  if (argv[0] !== "run") {
    throw new UsageFault(`unknown command ${JSON.stringify(argv[0])}\n${USAGE}`);
  }

  let filePath: string | undefined;
  let tideCount: number | undefined;
  let wash: number | undefined;
  let rise: number | undefined;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--tides" || arg.startsWith("--tides=")) {
      const raw = valueAfter(argv, arg, i, "--tides", "a positive integer");
      if (arg === "--tides") {
        i += 1;
      }
      tideCount = readCount(tideCount, raw);
      continue;
    }
    if (arg === "--wash" || arg.startsWith("--wash=")) {
      const raw = valueAfter(argv, arg, i, "--wash", "a non-negative integer");
      if (arg === "--wash") {
        i += 1;
      }
      wash = readWash(wash, raw);
      continue;
    }
    if (arg === "--rise" || arg.startsWith("--rise=")) {
      const raw = valueAfter(argv, arg, i, "--rise", "a non-negative number");
      if (arg === "--rise") {
        i += 1;
      }
      rise = readRise(rise, raw);
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
  const args: RunArgs = { filePath };
  if (tideCount !== undefined) {
    args.tideCount = tideCount;
  }
  if (wash !== undefined) {
    args.wash = wash;
  }
  if (rise !== undefined) {
    args.rise = rise;
  }
  return args;
}

function valueAfter(argv: string[], arg: string, index: number, flag: string, needs: string): string {
  if (arg === flag) {
    const raw = argv[index + 1];
    if (raw === undefined) {
      throw new UsageFault(`${flag} needs ${needs}\n${USAGE}`);
    }
    return raw;
  }
  return arg.slice(flag.length + 1);
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

function readWash(already: number | undefined, raw: string): number {
  if (already !== undefined) {
    throw new UsageFault(`--wash was given twice\n${USAGE}`);
  }
  if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) {
    throw new UsageFault(
      `--wash must be a non-negative integer, got ${JSON.stringify(raw)}\n${USAGE}`,
    );
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new UsageFault(
      `--wash must be a non-negative integer, got ${JSON.stringify(raw)}\n${USAGE}`,
    );
  }
  return value;
}

function readRise(already: number | undefined, raw: string): number {
  if (already !== undefined) {
    throw new UsageFault(`--rise was given twice\n${USAGE}`);
  }
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(raw)) {
    throw new UsageFault(
      `--rise must be a non-negative number, got ${JSON.stringify(raw)}\n${USAGE}`,
    );
  }
  return Number(raw);
}
