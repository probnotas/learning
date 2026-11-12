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

let failures = 0;
const fail = (id, msg) => {
  failures++;
  console.log(`  ✖ ${id}: ${msg}`);
};
const num = (x) => {
  const v = Number(x.trim().replace(/^(-?\d+)\/(\d+)$/, (_, a, b) => String(Number(a) / Number(b))));
  return v;
};

const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith(".mdx")).sort();
for (const f of files) {
  const id = f.slice(0, -4);
  const { data, content } = matter(fs.readFileSync(path.join(lessonsDir, f), "utf8"));
  if (!topicIds.has(String(data.topic))) fail(id, `topic "${data.topic}" not found in CURRICULUM.md`);
  if (!id.startsWith(`${String(data.topic)[0].toLowerCase()}-${String(data.topic).slice(1)}-`))
    fail(id, `filename should start with [trackId]-[topicId]- (e.g. a-1-...)`);

  // Nothing may sit outside an item: every top-level block must be one of the item tags.
  const stripped = content
    .replace(/<(Article|Watch|Read|Quiz|Build)\b[^>]*\/>/g, "")
    .replace(/<(Article|Watch|Read|Quiz|Build)\b[^>]*>[\s\S]*?<\/\1>/g, "")
    .trim();
  if (stripped) fail(id, `content outside an item: "${stripped.slice(0, 60)}…"`);

  const items = [...content.matchAll(/<(Article|Watch|Read|Quiz|Build)\b([^>]*?)\/?>/g)].map((m) => ({
    tag: m[1],
    id: m[2].match(/\bid="([^"]+)"/)?.[1],
    draft: /\bdraft\b/.test(m[2]),
  }));
  const ids = items.map((i) => i.id);
  if (ids.some((x) => !x)) fail(id, "an item is missing id=");
  if (new Set(ids).size !== ids.length) fail(id, "duplicate item ids");
  if (!items.some((i) => i.tag === "Watch" || i.tag === "Read")) fail(id, "no <Watch>/<Read> items");
  for (const tag of ["Article", "Quiz", "Build"]) if (!items.some((i) => i.tag === tag)) fail(id, `no <${tag}> item`);

  if (data.status === "full") {
    if (items.some((i) => i.draft)) fail(id, "full lesson with draft items");
    const quiz = content.slice(content.indexOf("<Quiz"), content.indexOf("</Quiz>"));
    const qs = [...quiz.matchAll(/<Q\b([^>]*)>([\s\S]*?)<\/Q>/g)];
    if (qs.length < 5 || qs.length > 10) fail(id, `expected 5-10 questions, found ${qs.length}`);
    for (const [, attrs, body] of qs) {
      const qid = attrs.match(/\bid="([^"]+)"/)?.[1];
      const answer = attrs.match(/\banswer="([^"]+)"/)?.[1];
      const choice = attrs.match(/\bchoice="([^"]+)"/)?.[1];
      if (!body.includes("<Solution>")) fail(id, `${qid}: no <Solution>`);
      if (!answer && !choice) fail(id, `${qid}: needs answer="…" or choice="…"`);
      if (answer && answer.split(";").some((a) => !isFinite(num(a)))) fail(id, `${qid}: unparseable answer "${answer}"`);
      if (choice) {
        const vs = [...body.matchAll(/<Choice v="([^"]+)"/g)].map((m) => m[1]);
        if (vs.length < 2) fail(id, `${qid}: fewer than 2 choices`);
        if (!vs.includes(choice)) fail(id, `${qid}: correct choice "${choice}" not among ${vs}`);
      }
    }
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
      console.log(`  ${passed === sol.results.length && !sol.error ? "✓" : "✖"} ${id}: ${items.length} items, ${qs.length} questions, ${passed}/${sol.results.length} tests pass (${ms} ms)`);
    }
  } else {
    console.log(`  · ${id}: stub (${items.filter((i) => !i.draft).length} ready items, ${items.filter((i) => i.draft).length} drafts)`);
  }
}
console.log(failures ? `\n${failures} problem(s) found.` : `\nAll ${files.length} lessons OK.`);
process.exit(failures ? 1 : 0);
