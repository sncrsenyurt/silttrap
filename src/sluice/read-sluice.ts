import { readFileSync } from "node:fs";

import {
  GATE_KINDS,
  isGateKind,
  type CourseGate,
  type Gate,
  type GateKind,
  type HoldGate,
  type NudgeGate,
  type PourGate,
  type Sluice,
} from "./shape.js";

const SLUICE_FIELDS = new Set(["title", "bed", "tideCount", "gates"]);

const GATE_FIELDS: Record<GateKind, ReadonlySet<string>> = {
  course: new Set(["kind", "path"]),
  nudge: new Set(["kind", "mark"]),
  pour: new Set(["kind", "mark", "text"]),
  hold: new Set(["kind", "ms"]),
};

export class SluiceFault extends Error {
  readonly filePath: string;

  constructor(filePath: string, detail: string) {
    super(`${filePath}: ${detail}`);
    this.name = "SluiceFault";
    this.filePath = filePath;
  }
}

/** Read one sluice file and return it, or throw `SluiceFault`. */
export function readSluice(filePath: string): Sluice {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    if (isEnoent(err)) {
      throw new SluiceFault(filePath, "no such file");
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "could not parse";
    throw new SluiceFault(filePath, `not valid JSON (${reason})`);
  }

  if (!isPlainObject(parsed)) {
    throw new SluiceFault(filePath, `sluice must be a JSON object, got ${shown(parsed)}`);
  }

  const extra = unknownKeys(parsed, SLUICE_FIELDS);
  if (extra.length > 0) {
    throw new SluiceFault(filePath, `unknown ${fieldWord(extra)} ${quotedList(extra)}`);
  }

  return {
    title: readTitle(filePath, parsed),
    bed: readBed(filePath, parsed),
    tideCount: readTideCount(filePath, parsed),
    gates: readGates(filePath, parsed),
  };
}

function readTitle(filePath: string, obj: Record<string, unknown>): string {
  if (!("title" in obj)) {
    throw new SluiceFault(filePath, "missing title");
  }
  const title = obj.title;
  if (typeof title !== "string" || title.trim() === "") {
    throw new SluiceFault(filePath, `title must be a non-empty string, got ${shown(title)}`);
  }
  return title;
}

function readBed(filePath: string, obj: Record<string, unknown>): string {
  if (!("bed" in obj)) {
    throw new SluiceFault(filePath, "missing bed");
  }
  const bed = obj.bed;
  if (typeof bed !== "string" || !isHttpUrl(bed)) {
    throw new SluiceFault(filePath, `bed must be an http(s) URL, got ${shown(bed)}`);
  }
  return bed;
}

function readTideCount(filePath: string, obj: Record<string, unknown>): number {
  if (!("tideCount" in obj)) {
    throw new SluiceFault(filePath, "missing tideCount");
  }
  const tideCount = obj.tideCount;
  if (typeof tideCount !== "number" || !Number.isInteger(tideCount) || tideCount < 1) {
    throw new SluiceFault(
      filePath,
      `tideCount must be a positive integer, got ${shown(tideCount)}`,
    );
  }
  return tideCount;
}

function readGates(filePath: string, obj: Record<string, unknown>): Gate[] {
  if (!("gates" in obj)) {
    throw new SluiceFault(filePath, "missing gates");
  }
  const gates = obj.gates;
  if (!Array.isArray(gates)) {
    throw new SluiceFault(filePath, `gates must be an array, got ${shown(gates)}`);
  }
  return gates.map((gate, index) => readGate(filePath, gate, index));
}

function readGate(filePath: string, value: unknown, index: number): Gate {
  const where = `gates[${index}]`;
  if (!isPlainObject(value)) {
    throw new SluiceFault(filePath, `${where} must be an object, got ${shown(value)}`);
  }
  if (!("kind" in value)) {
    throw new SluiceFault(filePath, `${where} is missing kind`);
  }
  const kind = value.kind;
  if (typeof kind !== "string") {
    throw new SluiceFault(filePath, `${where}.kind must be a string, got ${shown(kind)}`);
  }
  if (!isGateKind(kind)) {
    throw new SluiceFault(
      filePath,
      `${where}.kind ${JSON.stringify(kind)} is not a gate kind (${GATE_KINDS.join(", ")})`,
    );
  }

  const extra = unknownKeys(value, GATE_FIELDS[kind]);
  if (extra.length > 0) {
    throw new SluiceFault(filePath, `${where} has unknown ${fieldWord(extra)} ${quotedList(extra)}`);
  }

  switch (kind) {
    case "course":
      return readCourse(filePath, value, where);
    case "nudge":
      return readNudge(filePath, value, where);
    case "pour":
      return readPour(filePath, value, where);
    case "hold":
      return readHold(filePath, value, where);
  }
}

function readCourse(filePath: string, obj: Record<string, unknown>, where: string): CourseGate {
  const path = requiredString(filePath, obj, where, "path");
  if (!isCoursePath(path)) {
    throw new SluiceFault(
      filePath,
      `${where}.path must be an http(s) URL or a path starting with /, got ${shown(path)}`,
    );
  }
  return { kind: "course", path };
}

function readNudge(filePath: string, obj: Record<string, unknown>, where: string): NudgeGate {
  return { kind: "nudge", mark: requiredString(filePath, obj, where, "mark") };
}

function readPour(filePath: string, obj: Record<string, unknown>, where: string): PourGate {
  const mark = requiredString(filePath, obj, where, "mark");
  if (!("text" in obj)) {
    throw new SluiceFault(filePath, `${where} is missing text`);
  }
  const text = obj.text;
  if (typeof text !== "string") {
    throw new SluiceFault(filePath, `${where}.text must be a string, got ${shown(text)}`);
  }
  return { kind: "pour", mark, text };
}

function readHold(filePath: string, obj: Record<string, unknown>, where: string): HoldGate {
  if (!("ms" in obj)) {
    throw new SluiceFault(filePath, `${where} is missing ms`);
  }
  const ms = obj.ms;
  if (typeof ms !== "number" || !Number.isInteger(ms) || ms < 1) {
    throw new SluiceFault(filePath, `${where}.ms must be a positive integer, got ${shown(ms)}`);
  }
  return { kind: "hold", ms };
}

function requiredString(
  filePath: string,
  obj: Record<string, unknown>,
  where: string,
  field: string,
): string {
  if (!(field in obj)) {
    throw new SluiceFault(filePath, `${where} is missing ${field}`);
  }
  const value = obj[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new SluiceFault(filePath, `${where}.${field} must be a non-empty string, got ${shown(value)}`);
  }
  return value;
}

function isCoursePath(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }
  return isHttpUrl(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnoent(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}

function unknownKeys(obj: Record<string, unknown>, allowed: ReadonlySet<string>): string[] {
  return Object.keys(obj).filter((key) => !allowed.has(key));
}

function fieldWord(keys: string[]): string {
  return keys.length === 1 ? "field" : "fields";
}

function quotedList(keys: string[]): string {
  return keys.map((key) => JSON.stringify(key)).join(", ");
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
