import { describe, expect, it } from "vitest";

import { formatReading, shapeReading, SiltFault } from "./reading.js";

describe("shapeReading", () => {
  it("keeps heap used, node count, and listener count", () => {
    const reading = shapeReading(
      { usedSize: 1835008, totalSize: 4200000 },
      { documents: 2, nodes: 42, jsEventListeners: 3 },
    );
    expect(reading).toEqual({ heapUsed: 1835008, domNodes: 42, listeners: 3 });
    expect(formatReading(reading)).toBe("heap 1835008 nodes 42 listeners 3");
  });

  it("accepts zeros", () => {
    expect(shapeReading({ usedSize: 0 }, { nodes: 0, jsEventListeners: 0 })).toEqual({
      heapUsed: 0,
      domNodes: 0,
      listeners: 0,
    });
  });

  it("rejects a heap payload that is not an object", () => {
    expectFault(() => shapeReading(null, { nodes: 1, jsEventListeners: 1 }), "heap usage must be an object, got null");
  });

  it("rejects a missing usedSize", () => {
    expectFault(
      () => shapeReading({ totalSize: 10 }, { nodes: 1, jsEventListeners: 1 }),
      "heap usage is missing usedSize",
    );
  });

  it("rejects a negative heap", () => {
    expectFault(
      () => shapeReading({ usedSize: -1 }, { nodes: 1, jsEventListeners: 1 }),
      "heap usage.usedSize must be a non-negative integer, got -1",
    );
  });

  it("rejects dom counters that are not an object", () => {
    expectFault(
      () => shapeReading({ usedSize: 8 }, ["nodes"]),
      "dom counters must be an object, got an array",
    );
  });

  it("rejects a fractional listener count", () => {
    expectFault(
      () => shapeReading({ usedSize: 8 }, { nodes: 4, jsEventListeners: 1.5 }),
      "dom counters.jsEventListeners must be a non-negative integer, got 1.5",
    );
  });

  it("rejects a node count of the wrong type", () => {
    expectFault(
      () => shapeReading({ usedSize: 8 }, { nodes: "42", jsEventListeners: 1 }),
      'dom counters.nodes must be a non-negative integer, got "42"',
    );
  });
});

function expectFault(run: () => void, detail: string): void {
  let caught: unknown;
  try {
    run();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(SiltFault);
  expect((caught as SiltFault).message).toBe(detail);
}
