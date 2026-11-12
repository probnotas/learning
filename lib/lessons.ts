import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { loadCurriculum } from "./curriculum";
import type { BuildFiles, Curriculum, CurriculumIndex, ItemKind, ItemMeta, LessonMeta, Unit } from "./types";

export const LESSONS_DIR = path.join(process.cwd(), "content", "lessons");
export const BUILDS_DIR = path.join(process.cwd(), "content", "builds");
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function buildDir(id: string) {
  return path.join(BUILDS_DIR, id);
}

const ITEM_KIND: Record<string, ItemKind> = {
  Article: "article",
  Watch: "video",
  Read: "reading",
  Quiz: "quiz",
  Build: "build",
  Milestones: "milestones",
  Paper: "paper",
};

function parseLesson(id: string): LessonMeta {
  const raw = fs.readFileSync(path.join(LESSONS_DIR, `${id}.mdx`), "utf8");
  const { data, content } = matter(raw);
  const topic = String(data.topic ?? "").toUpperCase();

  const items: ItemMeta[] = [];
  for (const m of content.matchAll(/<(Article|Watch|Read|Quiz|Build|Milestones|Paper)\b([^>]*?)\/?>/g)) {
    const a = attrs(m[2]);
    const kind = ITEM_KIND[m[1]];
    if (!a.id) continue;
    let questionIds: string[] = [];
    if (kind === "quiz" && !/\bdraft\b/.test(m[2])) {
      const end = content.indexOf("</Quiz>", m.index);
      const block = content.slice(m.index, end < 0 ? undefined : end);
      questionIds = [...block.matchAll(/<Q\b[^>]*?\bid="([^"]+)"/g)].map((q) => q[1]);
    }
    if (kind === "milestones") {
      const end = content.indexOf("</Milestones>", m.index);
      const block = content.slice(m.index, end < 0 ? undefined : end);
      questionIds = [...block.matchAll(/<Milestone\b[^>]*?\bid="([^"]+)"/g)].map((q) => q[1]);
    }
    const draft = /\bdraft\b/.test(m[2]) || (kind === "build" && !fs.existsSync(path.join(buildDir(id), "tests.js")));
    items.push({
      id: a.id,
      kind,
      title: a.title ?? a.id,
      draft,
      questionIds,
      ...(a.youtube ? { youtube: a.youtube } : {}),
      ...(kind === "paper" ? { sections: (a.sections ?? "").split(";").map((x) => x.trim()).filter(Boolean) } : {}),
    });
  }

  return {
    id,
    title: String(data.title ?? id),
    topic,
    track: topic.charAt(0),
    month: typeof data.month === "number" ? data.month : null,
    order: Number(data.order ?? 999),
    status: data.status === "full" ? "full" : "stub",
    capstone: data.capstone === true,
    requires: Array.isArray(data.requires) ? data.requires.map(String) : [],
    hours: typeof data.hours === "number" ? data.hours : null,
    summary: String(data.summary ?? ""),
    items,
  };
}

export function listLessons(): LessonMeta[] {
  return fs
    .readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parseLesson(f.slice(0, -4)))
    .sort((a, b) => (a.month ?? 99) - (b.month ?? 99) || a.order - b.order);
}

/** Units in the order their first lesson appears on the path; Year-2 topics after. */
function buildUnits(curriculum: Curriculum, lessons: LessonMeta[]): Unit[] {
  const topics = curriculum.tracks.flatMap((t) => t.topics.map((tp) => ({ ...tp, trackTitle: t.title })));
  const order: string[] = [];
  for (const l of lessons) if (!order.includes(l.topic)) order.push(l.topic);
  for (const t of topics) if (!order.includes(t.id)) order.push(t.id);
  return order
    .map((id) => topics.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t, i) => ({
      topic: t.id,
      number: i + 1,
      title: t.title,
      trackTitle: t.trackTitle,
      lessonIds: lessons.filter((l) => l.topic === t.id).sort((a, b) => a.order - b.order).map((l) => l.id),
    }));
}

const EMPTY_INDEX: CurriculumIndex = {
  curriculum: { goal: "", learningStyle: "", orderingRule: "", tracks: [], prereqs: {}, graphText: "", mvp: [], mvpBudget: "", year2: "" },
  lessons: [],
  units: [],
};

export function loadIndex(): CurriculumIndex {
  try {
    const curriculum = loadCurriculum();
    const lessons = listLessons();
    return { curriculum, lessons, units: buildUnits(curriculum, lessons) };
  } catch (err) {
    // Every real page is prerendered at build time, where these files exist. At runtime on a
    // serverless host (e.g. a 404 for an unknown URL) they may not be bundled, so the
    // layout falls back to an empty index instead of crashing.
    if (process.env.NEXT_PHASE === "phase-production-build") throw err;
    return EMPTY_INDEX;
  }
}

export function readLessonSource(id: string): string | null {
  if (!ID_RE.test(id)) return null;
  const file = path.join(LESSONS_DIR, `${id}.mdx`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

/** Plain-text version of a lesson for AI context: articles, video notes and reading notes
 *  (practice answers and build solutions are left out on purpose). */
export function lessonPlainText(id: string): string {
  const src = readLessonSource(id);
  if (!src) return "";
  const { content } = matter(src);
  return content
    .replace(/<Quiz\b[\s\S]*?<\/Quiz>/g, "")
    .replace(/<Quiz\b[^>]*\/>/g, "")
    .replace(/<Build\b[\s\S]*?<\/Build>/g, "")
    .replace(/<Build\b[^>]*\/>/g, "")
    .replace(/<Paper\b[\s\S]*?<\/Paper>/g, "")
    .replace(/<(Article|Watch|Read)\b[^>]*title="([^"]*)"[^>]*>/g, (_m, tag: string, title: string) => `\n[${tag === "Watch" ? "Video" : tag === "Read" ? "Reading" : "Article"}: ${title}]\n`)
    .replace(/<\/?[A-Z][A-Za-z]*\b[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 18000);
}

export function readBuildFiles(id: string): BuildFiles | null {
  if (!ID_RE.test(id)) return null;
  const dir = buildDir(id);
  const read = (name: string) => {
    const f = path.join(dir, name);
    return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  };
  const starter = read("starter.js");
  const tests = read("tests.js");
  // "// @todo" markers drive scripts/make-starter.mjs; hide them from the revealed solution.
  const solution = read("solution.js")?.replace(/^\/\/ @todo.*\n/gm, "") ?? null;
  return starter !== null && tests !== null && solution !== null ? { starter, tests, solution } : null;
}
