import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = 4731;

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);

const server = createServer((req, res) => {
  let name = (req.url ?? "/").split("?")[0] ?? "/";
  try {
    name = decodeURIComponent(name);
  } catch {
    res.writeHead(400);
    res.end("bad path");
    return;
  }
  const rel = name.replace(/^\/+/, "");
  if (rel === "" || rel.includes("..") || rel.includes("\\") || rel.includes("\0")) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  const file = path.join(root, rel);
  if (!file.startsWith(`${root}${path.sep}`)) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  readFile(file)
    .then((body) => {
      const type = types.get(path.extname(file)) ?? "application/octet-stream";
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(body);
    })
    .catch(() => {
      res.writeHead(404);
      res.end("missing");
    });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`beds listening on http://127.0.0.1:${port}\n`);
});
