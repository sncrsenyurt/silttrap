# silttrap

Work in progress. I am writing a small TypeScript command line tool that opens one browser, replays the same short flow many times inside that single session, and exits with a failure if memory keeps rising.

I call the flow file a sluice. One replay of it is a tide. The numbers taken after a tide are a silt reading: JS heap used, DOM node count, and event listener count. Those are meant to come from the Chrome DevTools protocol, with a forced garbage collection before each reading, so leftover trash is not mistaken for a live leak. If the readings keep climbing, the run fails. Later, the same run should write a self-contained HTML file with an inline SVG chart and no extra assets.

## what works today

Basically nothing. There is a package skeleton, a TypeScript config, one placeholder sluice, and a CLI entry that only prints that it is not wired up yet. Playwright is declared as a dependency and is not called. There is no sampling, no pass or fail rule, and no report.

## rough plan

1. This scaffold.
2. Settle the sluice file shape and load one from disk.
3. Launch one Playwright browser and walk the sluice a single time.
4. Repeat that walk as tides without closing the browser.
5. Take a silt reading over the DevTools protocol after forcing a collection.
6. Fail the process when the readings show a climb that does not settle.
7. Write the HTML report into `settling/`.

I have not decided the climb rule, or the exact words for the steps inside a sluice. The file under `sluices/` is only the shape I am leaning toward: a starting page (the bed), how many tides to run, and an ordered list of gates.
