import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readSluice, SluiceFault } from "./read-sluice.js";

const samplePath = fileURLToPath(new URL("../../sluices/note-desk.sluice.json", import.meta.url));

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "silttrap-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("readSluice", () => {
  it("loads the note desk sample", () => {
    expect(readSluice(samplePath)).toEqual({
      title: "note desk",
      bed: "https://notes.example/desk",
      tideCount: 6,
      gates: [
        { kind: "pour", mark: "input[name=filter]", text: "tide" },
        { kind: "nudge", mark: "a.note-row" },
        { kind: "course", path: "/notes/draft" },
        { kind: "pour", mark: "textarea[name=body]", text: "kept from the last tide" },
        { kind: "nudge", mark: "button.save" },
        { kind: "hold", ms: 300 },
      ],
    });
  });

  it("accepts an absolute course and an empty pour", () => {
    const filePath = put("mixed.sluice.json", {
      title: "mixed",
      bed: "http://127.0.0.1:4010/",
      tideCount: 1,
      gates: [
        { kind: "course", path: "https://notes.example/archive" },
        { kind: "pour", mark: "input[name=filter]", text: "" },
        { kind: "hold", ms: 1 },
      ],
    });

    expect(readSluice(filePath).gates).toEqual([
      { kind: "course", path: "https://notes.example/archive" },
      { kind: "pour", mark: "input[name=filter]", text: "" },
      { kind: "hold", ms: 1 },
    ]);
  });

  it("allows an empty gate list", () => {
    const filePath = put("empty.sluice.json", validBody());
    expect(readSluice(filePath)).toEqual({
      title: "note desk",
      bed: "https://notes.example/desk",
      tideCount: 4,
      gates: [],
    });
  });

  it("rejects a missing file", () => {
    const filePath = path.join(dir, "gone.sluice.json");
    expectFault(filePath, "no such file");
  });

  it("rejects invalid JSON", () => {
    const filePath = putRaw("broken.sluice.json", "{");
    expectFault(
      filePath,
      "not valid JSON (Expected property name or '}' in JSON at position 1 (line 1 column 2))",
    );
  });

  it("rejects a JSON value that is not an object", () => {
    const filePath = putRaw("list.sluice.json", "[]");
    expectFault(filePath, "sluice must be a JSON object, got an array");
  });

  it("reads an optional wash and rise", () => {
    const filePath = put("ruled.sluice.json", { ...validBody(), wash: 0, rise: 0.25 });
    const sluice = readSluice(filePath);
    expect(sluice.wash).toBe(0);
    expect(sluice.rise).toBe(0.25);
  });

  it("rejects a wash or rise that is the wrong shape", () => {
    const wash = put("bad-wash.sluice.json", { ...validBody(), wash: -1 });
    expectFault(wash, "wash must be a non-negative integer, got -1");

    const rise = put("bad-rise.sluice.json", { ...validBody(), rise: "fast" });
    expectFault(rise, 'rise must be a non-negative number, got "fast"');
  });

  it("rejects an unknown top-level field", () => {
    const filePath = put("extra.sluice.json", { ...validBody(), pace: "fast" });
    expectFault(filePath, 'unknown field "pace"');
  });

  it("rejects a missing bed", () => {
    const body = validBody();
    delete body.bed;
    expectFault(put("no-bed.sluice.json", body), "missing bed");
  });

  it("rejects a bed that is not an http(s) URL", () => {
    const filePath = put("bad-bed.sluice.json", { ...validBody(), bed: "notes.example/desk" });
    expectFault(filePath, 'bed must be an http(s) URL, got "notes.example/desk"');
  });

  it("rejects an empty title", () => {
    const filePath = put("blank-title.sluice.json", { ...validBody(), title: "  " });
    expectFault(filePath, 'title must be a non-empty string, got "  "');
  });

  it("rejects a non-positive tide count", () => {
    const zero = put("zero.sluice.json", { ...validBody(), tideCount: 0 });
    expectFault(zero, "tideCount must be a positive integer, got 0");

    const negative = put("neg.sluice.json", { ...validBody(), tideCount: -3 });
    expectFault(negative, "tideCount must be a positive integer, got -3");
  });

  it("rejects a tide count with the wrong type", () => {
    const filePath = put("string-count.sluice.json", { ...validBody(), tideCount: "6" });
    expectFault(filePath, 'tideCount must be a positive integer, got "6"');
  });

  it("rejects a fractional tide count", () => {
    const filePath = put("fraction.sluice.json", { ...validBody(), tideCount: 1.5 });
    expectFault(filePath, "tideCount must be a positive integer, got 1.5");
  });

  it("rejects gates that are not an array", () => {
    const filePath = put("gates-object.sluice.json", { ...validBody(), gates: {} });
    expectFault(filePath, "gates must be an array, got an object");
  });

  it("rejects an unknown gate kind", () => {
    const filePath = put("leap.sluice.json", {
      ...validBody(),
      gates: [{ kind: "leap", path: "/away" }],
    });
    expectFault(filePath, 'gates[0].kind "leap" is not a gate kind (course, nudge, pour, hold)');
  });

  it("rejects a course path that is not absolute", () => {
    const filePath = put("rel.sluice.json", {
      ...validBody(),
      gates: [{ kind: "course", path: "notes/draft" }],
    });
    expectFault(
      filePath,
      'gates[0].path must be an http(s) URL or a path starting with /, got "notes/draft"',
    );
  });

  it("rejects a nudge with no mark", () => {
    const filePath = put("no-mark.sluice.json", {
      ...validBody(),
      gates: [{ kind: "nudge" }],
    });
    expectFault(filePath, "gates[0] is missing mark");
  });

  it("rejects a pour whose text is not a string", () => {
    const filePath = put("bad-text.sluice.json", {
      ...validBody(),
      gates: [{ kind: "pour", mark: "input[name=filter]", text: 12 }],
    });
    expectFault(filePath, "gates[0].text must be a string, got 12");
  });

  it("rejects a hold that is not a positive integer", () => {
    const filePath = put("zero-hold.sluice.json", {
      ...validBody(),
      gates: [{ kind: "hold", ms: 0 }],
    });
    expectFault(filePath, "gates[0].ms must be a positive integer, got 0");
  });

  it("rejects an unknown field on a gate", () => {
    const filePath = put("gate-extra.sluice.json", {
      ...validBody(),
      gates: [{ kind: "nudge", mark: "button.save", twice: true }],
    });
    expectFault(filePath, 'gates[0] has unknown field "twice"');
  });

  it("rejects a gate that is not an object", () => {
    const filePath = put("gate-string.sluice.json", {
      ...validBody(),
      gates: ["nudge"],
    });
    expectFault(filePath, 'gates[0] must be an object, got "nudge"');
  });
});

function validBody(): {
  title: string;
  bed: string;
  tideCount: number;
  gates: unknown[];
} {
  return {
    title: "note desk",
    bed: "https://notes.example/desk",
    tideCount: 4,
    gates: [],
  };
}

function put(name: string, value: unknown): string {
  return putRaw(name, JSON.stringify(value));
}

function putRaw(name: string, raw: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, raw);
  return filePath;
}

function expectFault(filePath: string, detail: string): void {
  let caught: unknown;
  try {
    readSluice(filePath);
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(SluiceFault);
  expect((caught as SluiceFault).message).toBe(`${filePath}: ${detail}`);
  expect((caught as SluiceFault).filePath).toBe(filePath);
}
