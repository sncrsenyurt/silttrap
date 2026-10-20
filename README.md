# silttrap

Work in progress. I am writing a small TypeScript command line tool that opens one browser, replays the same short flow many times inside that single session, and exits with a failure if memory keeps rising.

I call the flow file a sluice. One replay of it is a tide. The numbers taken after a tide are a silt reading: JS heap used, DOM node count, and event listener count. Those are meant to come from the Chrome DevTools protocol, with a forced garbage collection before each reading, so leftover trash is not mistaken for a live leak. If the readings keep climbing, the run fails. Later, the same run should write a self-contained HTML file with an inline SVG chart and no extra assets.

## what works today

Loading a sluice. `readSluice` reads one JSON file from disk and returns a typed object, or throws `SluiceFault` with a specific reason when the file is missing, not JSON, or the wrong shape. The sample flow is `sluices/note-desk.sluice.json`. The CLI still only prints that it is not wired up. Nothing opens a browser, nothing samples memory, and nothing writes a report.

## sluice file

A sluice is one JSON object.

- `title` is a non-empty string, a name for the flow.
- `bed` is an `http` or `https` URL. A tide starts there.
- `tideCount` is an integer greater than zero, how many times to replay.
- `gates` is an ordered list of steps. An empty list is allowed.

Each gate has a `kind`.

- `course` opens a page. `path` is an `http` or `https` URL, or a path that starts with `/`.
- `nudge` clicks whatever `mark` matches. `mark` is a non-empty string.
- `pour` types `text` into whatever `mark` matches. `text` is a string and may be empty.
- `hold` waits `ms` milliseconds, a positive integer.

Any other field is rejected. I am not joining a `/path` onto the bed yet. The loader only checks the shape.

## rough plan

1. Scaffold. Done.
2. Settle the sluice file shape and load one from disk. Done for reading and validation.
3. Launch one Playwright browser and walk the sluice a single time.
4. Repeat that walk as tides without closing the browser.
5. Take a silt reading over the DevTools protocol after forcing a collection.
6. Fail the process when the readings show a climb that does not settle.
7. Write the HTML report into `settling/`.

I have not decided the climb rule. Joining a course path onto the bed is still open.
