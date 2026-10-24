import { describe, expect, it } from "vitest";

import { parseArgs, UsageFault } from "./parse-args.js";

describe("parseArgs", () => {
  it("reads a sluice path and an optional tide count", () => {
    expect(parseArgs(["run", "sluices/note-desk.sluice.json"])).toEqual({
      filePath: "sluices/note-desk.sluice.json",
    });
    expect(parseArgs(["run", "sluices/note-desk.sluice.json", "--tides", "3"])).toEqual({
      filePath: "sluices/note-desk.sluice.json",
      tideCount: 3,
    });
    expect(parseArgs(["run", "--tides", "3", "sluices/note-desk.sluice.json"])).toEqual({
      filePath: "sluices/note-desk.sluice.json",
      tideCount: 3,
    });
    expect(parseArgs(["run", "sluices/note-desk.sluice.json", "--tides=8"])).toEqual({
      filePath: "sluices/note-desk.sluice.json",
      tideCount: 8,
    });
    expect(parseArgs(["run", "--wash", "0", "--rise=0.25", "sluices/note-desk.sluice.json"])).toEqual({
      filePath: "sluices/note-desk.sluice.json",
      wash: 0,
      rise: 0.25,
    });
    expect(parseArgs(["run", "sluices/note-desk.sluice.json", "--sheet", "settling/desk.html"])).toEqual({
      filePath: "sluices/note-desk.sluice.json",
      sheetPath: "settling/desk.html",
    });
    expect(parseArgs(["run", "--sheet=out/sheet.html", "a.json"])).toEqual({
      filePath: "a.json",
      sheetPath: "out/sheet.html",
    });
  });

  it("rejects a command that is not run", () => {
    expectUsage([], "missing command");
    expectUsage(["hop", "sluices/note-desk.sluice.json"], 'unknown command "hop"');
    expectUsage(["run"], "missing sluice file");
    expectUsage(["run", "a.json", "b.json"], 'unexpected argument "b.json"');
    expectUsage(["run", "a.json", "--pace", "fast"], 'unknown option "--pace"');
  });

  it("rejects a tide count that is not a positive integer", () => {
    expectUsage(["run", "a.json", "--tides"], "--tides needs a positive integer");
    expectUsage(["run", "a.json", "--tides", "0"], '--tides must be a positive integer, got "0"');
    expectUsage(["run", "a.json", "--tides", "1.5"], '--tides must be a positive integer, got "1.5"');
    expectUsage(["run", "a.json", "--tides=no"], '--tides must be a positive integer, got "no"');
    expectUsage(["run", "a.json", "--tides", "2", "--tides", "3"], "--tides was given twice");
  });

  it("rejects a wash or rise that is not usable", () => {
    expectUsage(["run", "a.json", "--wash"], "--wash needs a non-negative integer");
    expectUsage(["run", "a.json", "--wash", "-1"], '--wash must be a non-negative integer, got "-1"');
    expectUsage(["run", "a.json", "--wash=1.5"], '--wash must be a non-negative integer, got "1.5"');
    expectUsage(["run", "a.json", "--wash", "1", "--wash", "2"], "--wash was given twice");
    expectUsage(["run", "a.json", "--rise"], "--rise needs a non-negative number");
    expectUsage(["run", "a.json", "--rise", "no"], '--rise must be a non-negative number, got "no"');
    expectUsage(["run", "a.json", "--rise=-0.1"], '--rise must be a non-negative number, got "-0.1"');
    expectUsage(["run", "a.json", "--rise", "0.1", "--rise", "0.2"], "--rise was given twice");
  });

  it("rejects a sheet path that is missing or repeated", () => {
    expectUsage(["run", "a.json", "--sheet"], "--sheet needs a path");
    expectUsage(["run", "a.json", "--sheet="], "--sheet needs a path");
    expectUsage(["run", "a.json", "--sheet", "--rise", "0.1"], "--sheet needs a path");
    expectUsage(["run", "a.json", "--sheet", "one.html", "--sheet", "two.html"], "--sheet was given twice");
  });
});

function expectUsage(argv: string[], detail: string): void {
  let caught: unknown;
  try {
    parseArgs(argv);
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(UsageFault);
  expect((caught as UsageFault).message).toBe(
    `${detail}\nusage: silttrap run <sluice> [--tides N] [--wash N] [--rise R] [--sheet PATH]`,
  );
}
