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
    `${detail}\nusage: silttrap run <sluice> [--tides N]`,
  );
}
