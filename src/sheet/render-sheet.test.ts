import { describe, expect, it } from "vitest";

import { judge } from "../silt/verdict.js";
import type { TideLine } from "../tide/run-sluice.js";
import {
  CHART_HEIGHT,
  CHART_PAD,
  CHART_WIDTH,
  escapeText,
  placePoints,
  pointList,
  renderSheet,
} from "./render-sheet.js";

describe("placePoints", () => {
  it("puts the low value at the bottom and spaces tides across", () => {
    expect(placePoints([0, 50, 100], 100, 50, 10)).toEqual([
      { x: 10, y: 40 },
      { x: 50, y: 25 },
      { x: 90, y: 10 },
    ]);
  });

  it("lays a flat series on the midline", () => {
    expect(placePoints([8, 8], 100, 50, 10)).toEqual([
      { x: 10, y: 25 },
      { x: 90, y: 25 },
    ]);
  });

  it("centers a single reading", () => {
    expect(placePoints([7], 100, 50, 10)).toEqual([{ x: 50, y: 25 }]);
  });

  it("returns nothing when there are no readings", () => {
    expect(placePoints([], 100, 50, 10)).toEqual([]);
  });
});

describe("renderSheet", () => {
  it("draws each metric on its own scale and lists the raw readings", () => {
    const lines = [
      tide(1, 12, 0, 5, 3),
      tide(2, 18, 100, 5, 3),
    ];
    const html = renderSheet({
      title: "note desk",
      bed: "https://notes.example/desk",
      lines,
      verdict: judge(
        lines.map((line) => line.reading),
        { wash: 0, rise: 0.1 },
      ),
    });
    const heap = pointList(placePoints([0, 100], CHART_WIDTH, CHART_HEIGHT, CHART_PAD));
    const nodes = pointList(placePoints([5, 5], CHART_WIDTH, CHART_HEIGHT, CHART_PAD));

    expect(html).toContain(`<polyline points="${heap}" />`);
    expect(html).toContain(`<polyline points="${nodes}" />`);
    expect(html).toContain("heap climbing 0 to 100");
    expect(html).toContain("nodes settled 5 to 5");
    expect(html).toContain("listeners settled 3 to 3");
    expect(html).toContain("<td>1</td><td>12</td><td>0</td><td>5</td><td>3</td>");
    expect(html).toContain("<td>2</td><td>18</td><td>100</td><td>5</td><td>3</td>");
    expect(html).toContain("2 tides");
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link/i);
    expect(html).not.toMatch(/\ssrc=/i);
  });

  it("escapes text that came from the sluice", () => {
    const html = renderSheet({
      title: `note <desk> & "q"`,
      bed: `https://notes.example/a?b=1&c=<d>`,
      lines: [],
      verdict: judge([], { wash: 1, rise: 0.1 }),
    });

    expect(html).toContain("note &lt;desk&gt; &amp; &quot;q&quot;");
    expect(html).toContain("https://notes.example/a?b=1&amp;c=&lt;d&gt;");
    expect(html).not.toContain("<desk>");
    expect(html).not.toContain("<d>");
    expect(html).toContain("no readings");
    expect(html).toContain("heap short");
    expect(html).not.toContain("<polyline");
  });

  it("draws a dot and no line for a single tide", () => {
    const lines = [tide(1, 4, 20, 8, 1)];
    const html = renderSheet({
      title: "one",
      bed: "https://notes.example/one",
      lines,
      verdict: judge(
        lines.map((line) => line.reading),
        { wash: 0, rise: 0 },
      ),
    });
    const dot = placePoints([20], CHART_WIDTH, CHART_HEIGHT, CHART_PAD)[0];

    expect(html).toContain(`<circle cx="${dot?.x}" cy="${dot?.y}" r="3" />`);
    expect(html).not.toContain("<polyline");
    expect(html).toContain("1 tide");
    expect(html).toContain("heap short");
  });
});

describe("escapeText", () => {
  it("escapes the characters that would break out of text", () => {
    expect(escapeText(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

function tide(
  tideNumber: number,
  elapsedMs: number,
  heapUsed: number,
  domNodes: number,
  listeners: number,
): TideLine {
  return {
    tide: tideNumber,
    elapsedMs,
    reading: { heapUsed, domNodes, listeners },
  };
}
