import { formatVerdict, type Metric, type RunVerdict } from "../silt/verdict.js";
import type { TideLine } from "../tide/run-sluice.js";

export const CHART_WIDTH = 280;
export const CHART_HEIGHT = 120;
export const CHART_PAD = 18;

export type Point = {
  x: number;
  y: number;
};

export type SheetPage = {
  title: string;
  bed: string;
  lines: readonly TideLine[];
  verdict: RunVerdict;
};

const METRICS = [
  ["heap", "heapUsed"],
  ["nodes", "domNodes"],
  ["listeners", "listeners"],
] as const;

const CSS = `
body { margin: 28px; color: #1c1915; background: #f4f1ea; font: 16px/1.45 Georgia, "Iowan Old Style", serif; }
h1 { font-size: 22px; font-weight: 600; margin: 0 0 6px; overflow-wrap: anywhere; }
.meta { color: #5c564c; margin: 0 0 18px; overflow-wrap: anywhere; }
.charts { display: flex; flex-wrap: wrap; gap: 16px; margin: 0 0 20px; }
figure { margin: 0; }
figcaption { font: 13px/1.3 ui-sans-serif, system-ui, sans-serif; margin-top: 4px; }
svg { background: #fffdf8; border: 1px solid #d9d3c7; }
polyline { fill: none; stroke: #2f4f45; stroke-width: 2; }
circle { fill: #2f4f45; }
.settled { color: #2f4f45; }
.climbing { color: #8a3a24; }
.short { color: #6b645a; }
table { border-collapse: collapse; font: 13px/1.35 ui-sans-serif, system-ui, sans-serif; }
th, td { border-bottom: 1px solid #d9d3c7; padding: 4px 12px; text-align: right; }
th:first-child, td:first-child { text-align: left; }
`.trim();

/** Map readings onto a chart. Higher values sit higher. One value sits in the middle. */
export function placePoints(
  values: readonly number[],
  width: number,
  height: number,
  pad: number,
): Point[] {
  if (values.length === 0) {
    return [];
  }
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values.map((value, index) => {
    const x = values.length === 1 ? pad + innerW / 2 : pad + (index / (values.length - 1)) * innerW;
    const y = span === 0 ? pad + innerH / 2 : pad + (1 - (value - min) / span) * innerH;
    return { x: round1(x), y: round1(y) };
  });
}

export function pointList(points: readonly Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** One HTML page. CSS and the charts are inline. Nothing is loaded from elsewhere. */
export function renderSheet(page: SheetPage): string {
  const title = escapeText(page.title);
  const charts = METRICS.map(([metric, field]) =>
    renderChart(
      metric,
      page.lines.map((line) => line.reading[field]),
      page.verdict,
    ),
  ).join("\n");
  const rows = page.lines
    .map(
      (line) =>
        `<tr><td>${line.tide}</td><td>${line.elapsedMs}</td><td>${line.reading.heapUsed}</td><td>${line.reading.domNodes}</td><td>${line.reading.listeners}</td></tr>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">${escapeText(page.bed)} · ${tideWord(page.lines.length)} · wash ${page.verdict.wash} · rise ${page.verdict.rise}</p>
<div class="charts">
${charts}
</div>
<table>
<thead><tr><th>tide</th><th>ms</th><th>heap</th><th>nodes</th><th>listeners</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`;
}

function renderChart(metric: Metric, values: readonly number[], verdict: RunVerdict): string {
  const points = placePoints(values, CHART_WIDTH, CHART_HEIGHT, CHART_PAD);
  const line =
    points.length >= 2 ? `<polyline points="${pointList(points)}" />` : "";
  const dots = points
    .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3" />`)
    .join("");
  const empty =
    values.length === 0
      ? `<text x="${CHART_WIDTH / 2}" y="${CHART_HEIGHT / 2}" text-anchor="middle">no readings</text>`
      : "";
  const caption = formatVerdict(verdict).find((item) => item.startsWith(`${metric} `)) ?? metric;
  const mark = verdict.metrics.find((item) => item.metric === metric)?.mark ?? "short";
  return `<figure class="${mark}">
<svg width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" role="img"><title>${metric}</title>${empty}${line}${dots}</svg>
<figcaption>${escapeText(caption)}</figcaption>
</figure>`;
}

function tideWord(count: number): string {
  return count === 1 ? "1 tide" : `${count} tides`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
