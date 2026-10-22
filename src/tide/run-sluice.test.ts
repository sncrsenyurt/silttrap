import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type Page } from "playwright";

import { formatReading } from "../silt/reading.js";
import { type Sluice } from "../sluice/shape.js";
import { runSluice, TideFault } from "./run-sluice.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "silttrap-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runSluice", () => {
  it("walks two tides on the same page", async () => {
    const bed = putPage(
      "desk.html",
      `<!DOCTYPE html>
<input name="filter" />
<button class="save">save</button>
<p id="kept"></p>
<script>
  document.querySelector("button.save").addEventListener("click", () => {
    const field = document.querySelector("input[name=filter]");
    const next = Number(window.name || "0") + 1;
    window.name = String(next);
    document.querySelector("#kept").textContent = field.value + ":" + next;
  });
</script>`,
    );
    const sluice: Sluice = {
      title: "note desk",
      bed,
      tideCount: 6,
      gates: [
        { kind: "pour", mark: "input[name=filter]", text: "tide" },
        { kind: "nudge", mark: "button.save" },
        { kind: "hold", ms: 15 },
      ],
    };
    const logged: string[] = [];
    const seen: Page[] = [];
    const kept: string[] = [];
    let openContexts = 0;
    let openPages = 0;

    const lines = await runSluice(sluice, {
      tideCount: 2,
      write: (line) => logged.push(line),
      afterTide: async (page) => {
        seen.push(page);
        kept.push(await page.locator("#kept").innerText());
        openContexts = page.context().browser()?.contexts().length ?? 0;
        openPages = page.context().pages().length;
      },
    });

    expect(kept).toEqual(["tide:1", "tide:2"]);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
    expect(openContexts).toBe(1);
    expect(openPages).toBe(1);
    expect(seen[0]?.context().browser()?.isConnected()).toBe(false);
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.tide)).toEqual([1, 2]);
    expect(lines.every((line) => Number.isInteger(line.elapsedMs) && line.elapsedMs >= 0)).toBe(true);
    expect(
      lines.every(
        (line) =>
          Number.isInteger(line.reading.heapUsed) &&
          line.reading.heapUsed > 0 &&
          Number.isInteger(line.reading.domNodes) &&
          line.reading.domNodes > 0 &&
          Number.isInteger(line.reading.listeners) &&
          line.reading.listeners >= 0,
      ),
    ).toBe(true);
    expect(logged).toEqual(
      lines.map((line) => `tide ${line.tide} ${line.elapsedMs}ms ${formatReading(line.reading)}`),
    );
  });

  it("follows an absolute course for the sluice tide count", async () => {
    const bed = putPage("bed.html", "<!DOCTYPE html><p>bed</p>");
    const draft = putPage("draft.html", `<!DOCTYPE html><p id="where">draft</p>`);
    const sluice: Sluice = {
      title: "over to the draft",
      bed,
      tideCount: 1,
      gates: [{ kind: "course", path: draft }],
    };
    const seen: string[] = [];

    const lines = await runSluice(sluice, {
      write: () => undefined,
      afterTide: async (page) => {
        seen.push(page.url(), await page.locator("#where").innerText());
      },
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.tide).toBe(1);
    expect(seen).toEqual([draft, "draft"]);
  });

  it("stops when a course path is not joined onto the bed", async () => {
    const bed = putPage("bed.html", "<!DOCTYPE html><p>bed</p>");
    const sluice: Sluice = {
      title: "note desk",
      bed,
      tideCount: 3,
      gates: [{ kind: "course", path: "/notes/draft" }],
    };
    const logged: string[] = [];
    let caught: unknown;
    try {
      await runSluice(sluice, { write: (line) => logged.push(line) });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(TideFault);
    expect((caught as TideFault).message).toBe(
      'gates[0] path "/notes/draft" is not joined onto the bed yet',
    );
    expect(logged).toEqual([]);
  });
});

function putPage(name: string, html: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, html);
  return pathToFileURL(filePath).href;
}
