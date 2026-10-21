import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { silttrap } from "./cli.js";
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

    const lines = await silttrap(["run", filePath, "--tides", "2"], async (sluice, options) => {
      seen.push({ sluice, tideCount: options.tideCount });
      return [] satisfies TideLine[];
    });

    expect(lines).toEqual([]);
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
    await silttrap(["run", filePath], async (_sluice, received) => {
      options = received;
      return [];
    });
    expect(options).toEqual({ tideCount: undefined });
  });
});

function put(name: string, value: unknown): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, JSON.stringify(value));
  return filePath;
}
