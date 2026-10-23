import { describe, expect, it } from "vitest";

import { SiltFault, type SiltReading } from "./reading.js";
import { formatVerdict, isSettled, judge, type SiltRule } from "./verdict.js";

const rule: SiltRule = { wash: 1, rise: 0.1 };

describe("judge", () => {
  it("calls a flat series settled and ignores the warm-up tide", () => {
    const verdict = judge(series([100, 200, 200, 200]), { wash: 1, rise: 0 });
    expect(verdict.metrics.map((item) => item.mark)).toEqual(["settled", "settled", "settled"]);
    expect(isSettled(verdict)).toBe(true);
    expect(formatVerdict(verdict)).toEqual([
      "heap settled 200 to 200",
      "nodes settled 200 to 200",
      "listeners settled 200 to 200",
    ]);
  });

  it("calls a steady climb climbing", () => {
    const verdict = judge(series([100, 200, 250, 300, 360]), rule);
    expect(verdict.metrics[0]).toEqual({ metric: "heap", mark: "climbing", from: 200, to: 360 });
    expect(isSettled(verdict)).toBe(false);
  });

  it("calls a noisy series settled when it ends near the start", () => {
    const verdict = judge(series([100, 200, 260, 180, 210]), rule);
    expect(verdict.metrics[0]).toEqual({ metric: "heap", mark: "settled", from: 200, to: 210 });
    expect(isSettled(verdict)).toBe(true);
  });

  it("calls a series short when the wash leaves fewer than two readings", () => {
    const oneLeft = judge(series([100, 200]), rule);
    expect(oneLeft.metrics.map((item) => item.mark)).toEqual(["short", "short", "short"]);
    expect(formatVerdict(oneLeft)).toEqual(["heap short", "nodes short", "listeners short"]);
    expect(isSettled(oneLeft)).toBe(false);

    const none = judge([], { wash: 0, rise: 0.1 });
    expect(none.metrics.every((item) => item.mark === "short")).toBe(true);
  });

  it("judges each metric on its own", () => {
    const verdict = judge(
      [
        reading(1000, 10, 2),
        reading(1000, 10, 2),
        reading(1000, 20, 2),
        reading(1000, 40, 2),
      ],
      rule,
    );
    expect(verdict.metrics).toEqual([
      { metric: "heap", mark: "settled", from: 1000, to: 1000 },
      { metric: "nodes", mark: "climbing", from: 10, to: 40 },
      { metric: "listeners", mark: "settled", from: 2, to: 2 },
    ]);
  });

  it("treats growth equal to the rise as settled", () => {
    const verdict = judge(series([0, 1000, 1100]), rule);
    expect(verdict.metrics[0]?.mark).toBe("settled");
  });

  it("rejects a wash or rise that is not usable", () => {
    expect(() => judge(series([1, 1]), { wash: -1, rise: 0 })).toThrow(SiltFault);
    expect(() => judge(series([1, 1]), { wash: 0, rise: -0.2 })).toThrow(SiltFault);
  });
});

function series(values: number[]): SiltReading[] {
  return values.map((value) => reading(value, value, value));
}

function reading(heapUsed: number, domNodes: number, listeners: number): SiltReading {
  return { heapUsed, domNodes, listeners };
}
