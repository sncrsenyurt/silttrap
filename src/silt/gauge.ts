import { shapeReading, SiltFault, type SiltReading } from "./reading.js";

/** DevTools methods this reading uses. No parameters on any of them. */
export type SiltCall =
  | "HeapProfiler.collectGarbage"
  | "Runtime.getHeapUsage"
  | "Memory.getDOMCounters";

/** A Chrome DevTools session, narrowed to those calls. */
export type Gauge = {
  send(method: SiltCall): Promise<unknown>;
};

const COLLECT: SiltCall = "HeapProfiler.collectGarbage";

/**
 * Force two collections, then read heap used, DOM nodes, and listeners.
 * The second collection picks up objects the first one freed.
 */
export async function takeReading(gauge: Gauge): Promise<SiltReading> {
  await call(gauge, COLLECT);
  await call(gauge, COLLECT);
  const heap = await call(gauge, "Runtime.getHeapUsage");
  const counters = await call(gauge, "Memory.getDOMCounters");
  return shapeReading(heap, counters);
}

async function call(gauge: Gauge, method: SiltCall): Promise<unknown> {
  try {
    return await gauge.send(method);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new SiltFault(`${method} failed: ${reason}`);
  }
}
