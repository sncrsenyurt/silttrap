import { describe, expect, it } from "vitest";

import { takeReading, type Gauge, type SiltCall } from "./gauge.js";
import { SiltFault } from "./reading.js";

describe("takeReading", () => {
  it("collects garbage twice before reading heap and counters", async () => {
    const gauge = scripted([
      () => undefined,
      () => undefined,
      () => ({ usedSize: 4096, totalSize: 8192 }),
      () => ({ documents: 1, nodes: 11, jsEventListeners: 2 }),
    ]);

    const reading = await takeReading(gauge);

    expect(gauge.calls).toEqual([
      "HeapProfiler.collectGarbage",
      "HeapProfiler.collectGarbage",
      "Runtime.getHeapUsage",
      "Memory.getDOMCounters",
    ]);
    expect(reading).toEqual({ heapUsed: 4096, domNodes: 11, listeners: 2 });
  });

  it("does not read when the first collection fails", async () => {
    const gauge = scripted([() => Promise.reject(new Error("detached"))]);

    const caught = await faultFrom(gauge);

    expect(caught).toBeInstanceOf(SiltFault);
    expect(caught.message).toBe("HeapProfiler.collectGarbage failed: detached");
    expect(gauge.calls).toEqual(["HeapProfiler.collectGarbage"]);
  });

  it("reports a bad heap payload after both collections", async () => {
    const gauge = scripted([
      () => undefined,
      () => undefined,
      () => ({ totalSize: 10 }),
      () => ({ nodes: 1, jsEventListeners: 0 }),
    ]);

    const caught = await faultFrom(gauge);

    expect(caught).toBeInstanceOf(SiltFault);
    expect(caught.message).toBe("heap usage is missing usedSize");
    expect(gauge.calls).toHaveLength(4);
  });
});

type Scripted = Gauge & { calls: string[] };

function scripted(steps: Array<() => unknown>): Scripted {
  const calls: string[] = [];
  return {
    calls,
    async send(method: SiltCall): Promise<unknown> {
      const step = steps[calls.length];
      calls.push(method);
      if (step === undefined) {
        throw new Error(`unexpected ${method}`);
      }
      return step();
    },
  };
}

async function faultFrom(gauge: Gauge): Promise<SiltFault> {
  try {
    await takeReading(gauge);
  } catch (err) {
    return err as SiltFault;
  }
  throw new Error("takeReading did not throw");
}
