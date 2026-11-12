import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { loadCurriculum } from "./curriculum";
import type { BuildFiles, CurriculumIndex, LessonMeta, WatchItem } from "./types";

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

function parseLesson(id: string): LessonMeta {
  const raw = fs.readFileSync(path.join(LESSONS_DIR, `${id}.mdx`), "utf8");
  const { data, content } = matter(raw);
  const topic = String(data.topic ?? "").toUpperCase();

  const watchItems: WatchItem[] = [];
  for (const m of content.matchAll(/<(Watch|Read)\b([^>]*?)\/?>/g)) {
    const a = attrs(m[2]);
    if (a.id) watchItems.push({ id: a.id, title: a.title ?? a.id, kind: m[1] === "Watch" ? "watch" : "read" });
  }
  const problemIds = [...content.matchAll(/<Problem\b[^>]*?\bid="([^"]+)"/g)].map((m) => m[1]);
  const hasBuild = /<Build\b/.test(content) && fs.existsSync(path.join(buildDir(id), "tests.js"));

  return {
    id,
    title: String(data.title ?? id),
    topic,
    track: topic.charAt(0),
    month: typeof data.month === "number" ? data.month : null,
    order: Number(data.order ?? 999),
    status: data.status === "full" ? "full" : "stub",
    requires: Array.isArray(data.requires) ? data.requires.map(String) : [],
    hours: typeof data.hours === "number" ? data.hours : null,
    summary: String(data.summary ?? ""),
    watchItems,
    problemIds,
    hasBuild,
  };
}

export function listLessons(): LessonMeta[] {
  return fs
    .readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parseLesson(f.slice(0, -4)))
    .sort((a, b) => (a.month ?? 99) - (b.month ?? 99) || a.order - b.order);
}

export function loadIndex(): CurriculumIndex {
  return { curriculum: loadCurriculum(), lessons: listLessons() };
}

export function readLessonSource(id: string): string | null {
  if (!ID_RE.test(id)) return null;
  const file = path.join(LESSONS_DIR, `${id}.mdx`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
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
