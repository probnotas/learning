// Validates lesson content: required sections, problem counts, build files,
// and that every reference solution passes its tests (and every starter doesn't).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import matter from "gray-matter";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lessonsDir = path.join(root, "content", "lessons");
const buildsDir = path.join(root, "content", "builds");
const curriculum = fs.readFileSync(path.join(root, "CURRICULUM.md"), "utf8");
const topicIds = new Set([...curriculum.matchAll(/^- \*\*([A-Z]\d+)\./gm)].map((m) => m[1]));

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, "public", "harness-worker.js"), "utf8"), ctx);
const runHarness = (code, tests) => ctx.runHarness(code, tests);

const SECTIONS = ["## Why this matters", "## Watch / Read", "## Core ideas", "## Problem set", "## Build"];
let failures = 0;
const fail = (id, msg) => {
  failures++;
  console.log(`  ✖ ${id}: ${msg}`);
};

const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith(".mdx")).sort();
for (const f of files) {
  const id = f.slice(0, -4);
  const { data, content } = matter(fs.readFileSync(path.join(lessonsDir, f), "utf8"));
  if (!topicIds.has(String(data.topic))) fail(id, `topic "${data.topic}" not found in CURRICULUM.md`);
  if (!id.startsWith(`${String(data.topic)[0].toLowerCase()}-${String(data.topic).slice(1)}-`))
    fail(id, `filename should start with [trackId]-[topicId]- (e.g. a-1-...)`);
  for (const s of SECTIONS) if (!content.includes(s)) fail(id, `missing section "${s}"`);
  const watch = [...content.matchAll(/<(?:Watch|Read)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  if (watch.length === 0) fail(id, "no <Watch>/<Read> items");
  const problems = [...content.matchAll(/<Problem\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  const ids = [...watch, ...problems];
  if (new Set(ids).size !== ids.length) fail(id, "duplicate sub-task ids");

  if (data.status === "full") {
    if (problems.length < 5 || problems.length > 10) fail(id, `expected 5-10 problems, found ${problems.length}`);
    const solutions = (content.match(/<Solution>/g) ?? []).length;
    if (solutions !== problems.length) fail(id, `${problems.length} problems but ${solutions} <Solution> blocks`);
    if (!/<Build\b/.test(content)) fail(id, "full lesson without <Build />");
    const dir = path.join(buildsDir, id);
    const read = (n) => (fs.existsSync(path.join(dir, n)) ? fs.readFileSync(path.join(dir, n), "utf8") : null);
    const [starter, tests, solution] = ["starter.js", "tests.js", "solution.js"].map(read);
    if (!starter || !tests || !solution) {
      fail(id, "missing build files (starter.js, tests.js, solution.js)");
    } else {
      const t0 = Date.now();
      const sol = runHarness(solution, tests);
      const ms = Date.now() - t0;
      if (sol.error) fail(id, `solution error: ${sol.error}`);
      if (sol.results.length === 0) fail(id, "tests registered no test() cases");
      for (const r of sol.results) if (!r.pass) fail(id, `solution fails "${r.name}": ${r.message}`);
      const st = runHarness(starter, tests);
      if (!st.error && st.results.every((r) => r.pass)) fail(id, "starter already passes every test");
      const passed = sol.results.filter((r) => r.pass).length;
      console.log(`  ${passed === sol.results.length && !sol.error ? "✓" : "✖"} ${id}: ${problems.length} problems, ${passed}/${sol.results.length} tests pass (${ms} ms)`);
    }
  } else {
    if (!content.includes("<NotDrafted")) fail(id, "stub lesson should use <NotDrafted /> placeholders");
    console.log(`  · ${id}: stub (${watch.length} watch/read items)`);
  }
}
console.log(failures ? `\n${failures} problem(s) found.` : `\nAll ${files.length} lessons OK.`);
process.exit(failures ? 1 : 0);
