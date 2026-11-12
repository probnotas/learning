// Copies Monaco's prebuilt AMD bundle into public/ so the editor loads from
// localhost instead of a CDN (keeps the app free of third-party network calls).
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "monaco-editor", "min", "vs");
const dest = join(root, "public", "monaco", "vs");

if (!existsSync(src)) {
  console.warn("[copy-monaco] monaco-editor not installed yet; skipping.");
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-monaco] copied Monaco to public/monaco/vs");
