#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { parseArgs } from "./parse-args.js";
import { readSluice } from "./sluice/read-sluice.js";
import { runSluice, type TideLine } from "./tide/run-sluice.js";

export async function silttrap(argv: string[], run: typeof runSluice = runSluice): Promise<TideLine[]> {
  const args = parseArgs(argv);
  const sluice = readSluice(args.filePath);
  return run(sluice, { tideCount: args.tideCount });
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  void silttrap(process.argv.slice(2)).catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
