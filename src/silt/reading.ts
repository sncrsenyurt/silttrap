export class SiltFault extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "SiltFault";
  }
}

/** One sample taken after a tide: retained heap, DOM nodes, and listeners. */
export type SiltReading = {
  heapUsed: number;
  domNodes: number;
  listeners: number;
};

/** Turn raw DevTools payloads into a reading. Extra fields are ignored. */
export function shapeReading(heap: unknown, counters: unknown): SiltReading {
  return {
    heapUsed: readCount(heap, "usedSize", "heap usage"),
    domNodes: readCount(counters, "nodes", "dom counters"),
    listeners: readCount(counters, "jsEventListeners", "dom counters"),
  };
}

export function formatReading(reading: SiltReading): string {
  return `heap ${reading.heapUsed} nodes ${reading.domNodes} listeners ${reading.listeners}`;
}

function readCount(source: unknown, field: string, label: string): number {
  if (!isRecord(source)) {
    throw new SiltFault(`${label} must be an object, got ${shown(source)}`);
  }
  if (!Object.hasOwn(source, field)) {
    throw new SiltFault(`${label} is missing ${field}`);
  }
  const value = source[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new SiltFault(`${label}.${field} must be a non-negative integer, got ${shown(value)}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shown(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "an array";
  }
  if (typeof value === "object") {
    return "an object";
  }
  return typeof value;
}
