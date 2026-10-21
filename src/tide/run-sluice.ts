import { chromium, type Page } from "playwright";

import { type CourseGate, type Gate, type Sluice } from "../sluice/shape.js";

export class TideFault extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "TideFault";
  }
}

/** One finished tide: its number, and how long the walk took. */
export type TideLine = {
  tide: number;
  elapsedMs: number;
};

export type RunSluiceOptions = {
  tideCount?: number;
  write?: (line: string) => void;
  afterTide?: (page: Page, line: TideLine) => void | Promise<void>;
};

/** Replay one sluice for several tides on a single page, then close the browser. */
export async function runSluice(sluice: Sluice, options: RunSluiceOptions = {}): Promise<TideLine[]> {
  const tideCount = options.tideCount ?? sluice.tideCount;
  if (!Number.isInteger(tideCount) || tideCount < 1) {
    throw new TideFault(`tide count must be a positive integer, got ${String(tideCount)}`);
  }

  const write = options.write ?? ((line: string) => console.log(line));
  const lines: TideLine[] = [];
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    for (let tide = 1; tide <= tideCount; tide += 1) {
      const started = performance.now();
      await walkTide(page, sluice);
      const line: TideLine = { tide, elapsedMs: Math.round(performance.now() - started) };
      lines.push(line);
      write(`tide ${line.tide} ${line.elapsedMs}ms`);
      if (options.afterTide) {
        await options.afterTide(page, line);
      }
    }
  } finally {
    await browser.close();
  }
  return lines;
}

async function walkTide(page: Page, sluice: Sluice): Promise<void> {
  await page.goto(sluice.bed);
  for (const [index, gate] of sluice.gates.entries()) {
    await walkGate(page, gate, index);
  }
}

async function walkGate(page: Page, gate: Gate, index: number): Promise<void> {
  switch (gate.kind) {
    case "course":
      await openCourse(page, gate, index);
      return;
    case "nudge":
      await page.locator(gate.mark).click();
      return;
    case "pour":
      await page.locator(gate.mark).fill(gate.text);
      return;
    case "hold":
      await delay(gate.ms);
      return;
    default: {
      const leftover: never = gate;
      throw new TideFault(`gates[${index}] has an unknown kind ${JSON.stringify(leftover)}`);
    }
  }
}

async function openCourse(page: Page, gate: CourseGate, index: number): Promise<void> {
  if (gate.path.startsWith("/")) {
    throw new TideFault(
      `gates[${index}] path ${JSON.stringify(gate.path)} is not joined onto the bed yet`,
    );
  }
  await page.goto(gate.path);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
