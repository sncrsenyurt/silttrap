#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { parseArgs } from "./parse-args.js";
import { renderSheet } from "./sheet/render-sheet.js";
import { DEFAULT_SHEET_PATH, writeSheet } from "./sheet/write-sheet.js";
import { formatVerdict, isSettled, judge, DEFAULT_RISE, DEFAULT_WASH, type RunVerdict } from "./silt/verdict.js";
import { readSluice } from "./sluice/read-sluice.js";
import { runSluice, type TideLine } from "./tide/run-sluice.js";

export type SilttrapRun = {
  lines: TideLine[];
  verdict: RunVerdict;
  sheetPath: string;
};

export async function silttrap(
  argv: string[],
  run: typeof runSluice = runSluice,
  write: (line: string) => void = (line) => console.log(line),
): Promise<SilttrapRun> {
  const args = parseArgs(argv);
  const sluice = readSluice(args.filePath);
  const lines = await run(sluice, { tideCount: args.tideCount });
  const verdict = judge(lines.map((line) => line.reading), {
    wash: args.wash ?? sluice.wash ?? DEFAULT_WASH,
    rise: args.rise ?? sluice.rise ?? DEFAULT_RISE,
  });
  for (const line of formatVerdict(verdict)) {
    write(line);
  }
  const sheetPath = args.sheetPath ?? DEFAULT_SHEET_PATH;
  writeSheet(
    sheetPath,
    renderSheet({
      title: sluice.title,
      bed: sluice.bed,
      lines,
      verdict,
    }),
  );
  write(`sheet ${sheetPath}`);
  return { lines, verdict, sheetPath };
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
  void silttrap(process.argv.slice(2))
    .then((result) => {
      if (!isSettled(result.verdict)) {
        process.exitCode = 1;
      }
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    });
}
