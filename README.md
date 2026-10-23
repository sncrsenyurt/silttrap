# silttrap

Work in progress. I am writing a small TypeScript command line tool that opens one browser, replays the same short flow many times inside that single session, and exits with a failure if memory keeps rising.

I call the flow file a sluice. One replay of it is a tide. The numbers taken after a tide are a silt reading: JS heap used, DOM node count, and event listener count. Those are meant to come from the Chrome DevTools protocol, with a forced garbage collection before each reading, so leftover trash is not mistaken for a live leak. If the readings keep climbing, the run fails. Later, the same run should write a self-contained HTML file with an inline SVG chart and no extra assets.

## what works today

Loading a sluice. `readSluice` reads one JSON file from disk and returns a typed object, or throws `SluiceFault` with a specific reason when the file is missing, not JSON, or the wrong shape. The sample flow is `sluices/note-desk.sluice.json`.

Running tides. `silttrap run sluices/note-desk.sluice.json` loads that file and opens one headless Chromium, one context, and one page. A tide starts at `bed`, then walks `gates` in order. The next tide reuses that same page. The count is the sluice `tideCount`. `--tides N` overrides it. After the gates, I take a silt reading on that page and print one line: `tide 1 84ms heap 1835008 nodes 42 listeners 3`. The browser closes when the run finishes, and it also closes when a gate throws.

The reading comes from one Chrome DevTools session on that page. I call `HeapProfiler.collectGarbage` twice, so the numbers are what is still retained, then `Runtime.getHeapUsage` for JS heap used (`usedSize`) and `Memory.getDOMCounters` for the DOM node count (`nodes`) and the event listener count (`jsEventListeners`). This is Chromium only. I do not launch Firefox or WebKit, because those three numbers are Chrome protocol fields.

After the tides I judge each metric and print a line: `heap settled 1000 to 1040`, `nodes climbing 40 to 80`, or `listeners short`. I ignore the first `wash` tides (default 1). `rise` (default 0.1) is the fraction the last counted reading may sit above the first. Over that, the metric is climbing. Fewer than two counted readings is short. A spike in the middle does not count; I only compare the ends. The process exits 1 unless every metric is settled. `--wash` and `--rise` override the same fields on the sluice.

I am not joining a course path that starts with `/` onto the bed yet. Reaching one throws `TideFault`. The note desk sample has `/notes/draft`, and its bed is only an example URL, so that file does not finish a tide and does not print a reading. Nothing writes a report.

## sluice file

A sluice is one JSON object.

- `title` is a non-empty string, a name for the flow.
- `bed` is an `http` or `https` URL. A tide starts there.
- `tideCount` is an integer greater than zero, how many times to replay.
- `gates` is an ordered list of steps. An empty list is allowed.
- `wash` is optional, an integer of zero or more. The first that many tides are left out of the verdict. Default 1.
- `rise` is optional, a number of zero or more. Allowed growth as a fraction of the first counted reading. Default 0.1.

Each gate has a `kind`.

- `course` opens a page. `path` is an `http` or `https` URL, or a path that starts with `/`.
- `nudge` clicks whatever `mark` matches. `mark` is a non-empty string.
- `pour` types `text` into whatever `mark` matches. `text` is a string and may be empty.
- `hold` waits `ms` milliseconds, a positive integer.

Any other field is rejected. I am not joining a `/path` onto the bed yet. The loader only checks the shape.

## rough plan

1. Scaffold. Done.
2. Settle the sluice file shape and load one from disk. Done for reading and validation.
3. Launch one Playwright browser and walk the sluice a single time. Done.
4. Repeat that walk as tides without closing the browser. Done.
5. Take a silt reading over the DevTools protocol after forcing a collection. Done.
6. Fail the process when the readings show a climb that does not settle. Done. The rule is `wash` and `rise`, above.
7. Write the HTML report into `settling/`.

Joining a course path onto the bed is still open. The report is still unwritten.
