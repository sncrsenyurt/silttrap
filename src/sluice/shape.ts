/** Gate kinds a sluice can ask a later tide to walk. */

export const GATE_KINDS = ["course", "nudge", "pour", "hold"] as const;

export type GateKind = (typeof GATE_KINDS)[number];

/** Open an absolute URL, or a path that starts with `/`. */
export type CourseGate = {
  kind: "course";
  path: string;
};

/** Click the element `mark` matches. */
export type NudgeGate = {
  kind: "nudge";
  mark: string;
};

/** Type `text` into the element `mark` matches. `text` may be empty. */
export type PourGate = {
  kind: "pour";
  mark: string;
  text: string;
};

/** Wait `ms` milliseconds before the next gate. */
export type HoldGate = {
  kind: "hold";
  ms: number;
};

export type Gate = CourseGate | NudgeGate | PourGate | HoldGate;

export type Sluice = {
  title: string;
  bed: string;
  tideCount: number;
  gates: Gate[];
};

export function isGateKind(value: string): value is GateKind {
  return (GATE_KINDS as readonly string[]).includes(value);
}
