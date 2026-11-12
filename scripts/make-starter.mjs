// Generate content/builds/<lessonId>/starter.js from solution.js.
// Mark each function you want the learner to write with a comment right above it:
//
//   // @todo Row picture: output[i] = dot(row i, v).
//   function matVec(M, v) {
//     ...reference body...
//   }
//
// The body (up to the closing "}" at column 0) is replaced by the hint and a
// `throw new Error("TODO: implement <name>")`. Everything else is copied as-is.
// Usage: node scripts/make-starter.mjs <lessonId> [<lessonId> ...]
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
for (const id of process.argv.slice(2)) {
  const dir = path.join(root, "content", "builds", id);
  const lines = fs.readFileSync(path.join(dir, "solution.js"), "utf8").split("\n");
  const out = [];
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const todo = lines[i].match(/^\/\/ @todo ?(.*)$/);
    if (!todo) {
      out.push(lines[i]);
      continue;
    }
    const sig = lines[i + 1];
    const name = sig.match(/^function\s+(\w+)/)?.[1];
    if (!name) throw new Error(`${id}: "// @todo" must be directly above a top-level function (line ${i + 1})`);
    let end = i + 2;
    while (end < lines.length && lines[end] !== "}") end++;
    out.push(sig);
    for (const h of todo[1].split(" | ").filter(Boolean)) out.push(`  // ${h}`);
    out.push(`  throw new Error("TODO: implement ${name}");`, "}");
    i = end;
    count++;
  }
  // Strip the markers from the solution's view too: keep them only as plain comments.
  fs.writeFileSync(path.join(dir, "starter.js"), out.join("\n"));
  console.log(`${id}: ${count} function(s) stubbed`);
}
