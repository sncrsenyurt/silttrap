import { SiltFault, type SiltReading } from "./reading.js";

/** Tides skipped at the start of a run. The first one is warm-up. */
export const DEFAULT_WASH = 1;

/** Fraction the last counted reading may sit above the first. */
export const DEFAULT_RISE = 0.1;

export type SiltRule = {
  wash: number;
  rise: number;
};

export type Metric = "heap" | "nodes" | "listeners";

export type Mark = "settled" | "climbing" | "short";

export type MetricVerdict =
  | { metric: Metric; mark: "short" }
  | { metric: Metric; mark: "settled" | "climbing"; from: number; to: number };

export type RunVerdict = {
  wash: number;
  rise: number;
  metrics: MetricVerdict[];
};

const FIELDS = [
  ["heap", "heapUsed"],
  ["nodes", "domNodes"],
  ["listeners", "listeners"],
] as const;

/**
 * Readings are in tide order. The first `wash` are ignored.
 * A metric is climbing when the last counted value is more than `rise`
 * times the first counted value above that first value. Fewer than two
 * counted readings is short.
 */
export function judge(readings: readonly SiltReading[], rule: SiltRule): RunVerdict {
  if (!Number.isInteger(rule.wash) || rule.wash < 0) {
    throw new SiltFault(`wash must be a non-negative integer, got ${String(rule.wash)}`);
  }
  if (typeof rule.rise !== "number" || !Number.isFinite(rule.rise) || rule.rise < 0) {
    throw new SiltFault(`rise must be a non-negative number, got ${String(rule.rise)}`);
  }

  return {
    wash: rule.wash,
    rise: rule.rise,
    metrics: FIELDS.map(([metric, field]) =>
      judgeMetric(
        metric,
        readings.map((reading) => reading[field]),
        rule,
      ),
    ),
  };
}

export function isSettled(verdict: RunVerdict): boolean {
  return verdict.metrics.every((item) => item.mark === "settled");
}

export function formatVerdict(verdict: RunVerdict): string[] {
  return verdict.metrics.map((item) => {
    if (item.mark === "short") {
      return `${item.metric} short`;
    }
    return `${item.metric} ${item.mark} ${item.from} to ${item.to}`;
  });
}

function judgeMetric(metric: Metric, values: readonly number[], rule: SiltRule): MetricVerdict {
  const counted = values.slice(rule.wash);
  const first = counted[0];
  const last = counted[counted.length - 1];
  if (first === undefined || last === undefined || counted.length < 2) {
    return { metric, mark: "short" };
  }
  const grown = last - first;
  const allowed = first * rule.rise;
  const mark = grown > allowed ? "climbing" : "settled";
  return { metric, mark, from: first, to: last };
}
