import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { silttrap } from "./cli.js";
import { type SiltReading } from "./silt/reading.js";
import { isSettled } from "./silt/verdict.js";
import { type Sluice } from "./sluice/shape.js";
import { type RunSluiceOptions, type TideLine } from "./tide/run-sluice.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "silttrap-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("silttrap", () => {
  it("loads the sluice and passes a tide override through", async () => {
    const filePath = put("desk.sluice.json", {
      title: "note desk",
      bed: "https://notes.example/desk",
      tideCount: 6,
      gates: [],
    });
    const seen: { sluice: Sluice; tideCount: number | undefined }[] = [];
    const lines = flatLines();

    const result = await silttrap(
      ["run", filePath, "--tides", "2"],
      async (sluice, options) => {
        seen.push({ sluice, tideCount: options.tideCount });
        return lines;
      },
      () => undefined,
    );

    expect(result.lines).toEqual(lines);
    expect(isSettled(result.verdict)).toBe(true);
    expect(seen).toEqual([
      {
        sluice: {
          title: "note desk",
          bed: "https://notes.example/desk",
          tideCount: 6,
          gates: [],
        },
        tideCount: 2,
      },
    ]);
  });

  it("leaves the tide count to the sluice when the flag is absent", async () => {
    const filePath = put("desk.sluice.json", {
      title: "note desk",
      bed: "https://notes.example/desk",
      tideCount: 4,
      gates: [{ kind: "hold", ms: 20 }],
    });
    let options: RunSluiceOptions | undefined;
    await silttrap(
      ["run", filePath],
      async (_sluice, received) => {
        options = received;
        return flatLines();
      },
      () => undefined,
    );
    expect(options).toEqual({ tideCount: undefined });
  });

  it("prints a verdict and keeps a climb from a flat metric", async () => {
    const filePath = put("desk.sluice.json", {
      title: "note desk",
      bed: "https://notes.example/desk",
      tideCount: 4,
      wash: 1,
      rise: 0.1,
      gates: [],
    });
    const logged: string[] = [];
    const lines: TideLine[] = [
      tide(reading(1000, 10, 2)),
      tide(reading(1000, 10, 2)),
      tide(reading(1000, 20, 2)),
      tide(reading(1000, 40, 2)),
    ];

    const result = await silttrap(
      ["run", filePath],
      async () => lines,
      (line) => logged.push(line),
    );

    expect(logged).toEqual([
      "heap settled 1000 to 1000",
      "nodes climbing 10 to 40",
      "listeners settled 2 to 2",
    ]);
    expect(isSettled(result.verdict)).toBe(false);
  });

  it("lets a flag override the sluice rise", async () => {
    const filePath = put("desk.sluice.json", {
      title: "note desk",
      bed: "https://notes.example/desk",
      tideCount: 2,
      wash: 0,
      rise: 0,
      gates: [],
    });
    const lines: TideLine[] = [tide(reading(100, 100, 100)), tide(reading(110, 110, 110))];

    const tight = await silttrap(["run", filePath], async () => lines, () => undefined);
    const loose = await silttrap(
      ["run", filePath, "--rise", "0.5"],
      async () => lines,
      () => undefined,
    );

    expect(tight.verdict.metrics[0]?.mark).toBe("climbing");
    expect(loose.verdict.metrics[0]?.mark).toBe("settled");
    expect(loose.verdict.rise).toBe(0.5);
  });

  it("lets a flag wash hide a short comparison", async () => {
    const filePath = put("desk.sluice.json", {
      title: "note desk",
      bed: "https://notes.example/desk",
      tideCount: 2,
      wash: 0,
      rise: 0.1,
      gates: [],
    });
    const lines: TideLine[] = [tide(reading(100, 100, 100)), tide(reading(500, 500, 500))];

    const result = await silttrap(
      ["run", filePath, "--wash", "1"],
      async () => lines,
      () => undefined,
    );

    expect(result.verdict.metrics.every((item) => item.mark === "short")).toBe(true);
    expect(isSettled(result.verdict)).toBe(false);
  });
});

function flatLines(): TideLine[] {
  const sample = reading(200, 200, 200);
  return [tide(reading(100, 100, 100)), tide(sample), tide(sample), tide(sample)];
}

function tide(sample: SiltReading): TideLine {
  return { tide: 1, elapsedMs: 1, reading: sample };
}

function reading(heapUsed: number, domNodes: number, listeners: number): SiltReading {
  return { heapUsed, domNodes, listeners };
}

function put(name: string, value: unknown): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, JSON.stringify(value));
  return filePath;
}
