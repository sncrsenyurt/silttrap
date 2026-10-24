import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Default sheet path. `settling/` is gitignored. */
export const DEFAULT_SHEET_PATH = path.join("settling", "sheet.html");

export function writeSheet(filePath: string, html: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, html, "utf8");
}
