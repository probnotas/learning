// Pure progress / locking logic. No React, no storage — easy to reason about.
import type { CurriculumIndex, LessonMeta } from "./types";

export type LessonState = "not_started" | "watching" | "problems_done" | "build_done" | "complete";

export interface LessonProgress {
  watched: Record<string, boolean>;
  problems: Record<string, boolean>;
  buildPassed: boolean; // tests passed at least once
  buildDone: boolean;
  completeFlag: boolean;
  notes: string;
  code?: string;
  override: boolean; // "unlock anyway"
  lastVisited?: string;
}

export interface BuildLogEntry {
  id: string;
  date: string; // ISO
  lessonId: string | null;
  projectId: string | null;
  text: string;
}

export interface AppState {
  version: 1;
  lessons: Record<string, LessonProgress>;
  activityDays: string[]; // local YYYY-MM-DD
  lastLessonId: string | null;
  notebook: string;
  buildLog: BuildLogEntry[];
}

export const EMPTY_STATE: AppState = {
  version: 1,
  lessons: {},
  activityDays: [],
  lastLessonId: null,
  notebook: "",
  buildLog: [],
};

export const EMPTY_LESSON: LessonProgress = {
  watched: {},
  problems: {},
  buildPassed: false,
  buildDone: false,
  completeFlag: false,
  notes: "",
  override: false,
};

export function lp(state: AppState, id: string): LessonProgress {
  return state.lessons[id] ?? EMPTY_LESSON;
}

export function watchDone(meta: LessonMeta, p: LessonProgress) {
  return meta.watchItems.length > 0 && meta.watchItems.every((w) => p.watched[w.id]);
}
export function problemsDone(meta: LessonMeta, p: LessonProgress) {
  return meta.problemIds.length > 0 && meta.problemIds.every((id) => p.problems[id]);
}
export function buildDone(meta: LessonMeta, p: LessonProgress) {
  return meta.hasBuild && p.buildDone;
}
/** Learn-by-doing rule: watch/read AND problems AND build. */
export function canComplete(meta: LessonMeta, p: LessonProgress) {
  return watchDone(meta, p) && problemsDone(meta, p) && buildDone(meta, p);
}
export function isComplete(meta: LessonMeta, p: LessonProgress) {
  return p.completeFlag && canComplete(meta, p);
}

export function lessonState(meta: LessonMeta, p: LessonProgress): LessonState {
  if (isComplete(meta, p)) return "complete";
  if (buildDone(meta, p)) return "build_done";
  if (problemsDone(meta, p)) return "problems_done";
  const anyWatched = meta.watchItems.some((w) => p.watched[w.id]);
  const anyWork = Object.values(p.problems).some(Boolean) || p.buildPassed;
  return anyWatched || anyWork ? "watching" : "not_started";
}

export const STATE_LABEL: Record<LessonState, string> = {
  not_started: "Not started",
  watching: "In progress",
  problems_done: "Problems done",
  build_done: "Build done",
  complete: "Complete",
};

/** Fraction of sub-tasks checked (watch items + problems + build). */
export function subtaskFraction(meta: LessonMeta, p: LessonProgress): number {
  const total = meta.watchItems.length + meta.problemIds.length + (meta.hasBuild ? 1 : 0);
  if (total === 0) return 0;
  const done =
    meta.watchItems.filter((w) => p.watched[w.id]).length +
    meta.problemIds.filter((id) => p.problems[id]).length +
    (meta.hasBuild && p.buildDone ? 1 : 0);
  return done / total;
}

export function topicComplete(index: CurriculumIndex, state: AppState, topicId: string): boolean {
  const lessons = index.lessons.filter((l) => l.topic === topicId);
  return lessons.length > 0 && lessons.every((l) => isComplete(l, lp(state, l.id)));
}

export function topicTitle(index: CurriculumIndex, topicId: string): string {
  for (const t of index.curriculum.tracks) {
    const tp = t.topics.find((x) => x.id === topicId);
    if (tp) return `${tp.id}. ${tp.title}`;
  }
  return topicId;
}

export interface LockInfo {
  locked: boolean; // effective (after override)
  reasons: string[]; // why it would be locked, even if overridden
  overridden: boolean;
}

export function lockInfo(index: CurriculumIndex, state: AppState, meta: LessonMeta): LockInfo {
  const reasons: string[] = [];
  for (const pre of index.curriculum.prereqs[meta.topic] ?? []) {
    if (!topicComplete(index, state, pre)) reasons.push(`Finish topic ${topicTitle(index, pre)} first.`);
  }
  // Within a topic, lessons go in order ("finish one resource before the next").
  const siblings = index.lessons.filter((l) => l.topic === meta.topic);
  for (const s of siblings) {
    if (s.id === meta.id) break;
    if (!isComplete(s, lp(state, s.id))) reasons.push(`Finish the earlier ${meta.topic} lesson "${s.title}" first.`);
  }
  for (const reqId of meta.requires) {
    const req = index.lessons.find((l) => l.id === reqId);
    if (req && !isComplete(req, lp(state, req.id)) && !siblings.includes(req)) {
      reasons.push(`Finish lesson "${req.title}" first.`);
    }
  }
  const overridden = lp(state, meta.id).override && reasons.length > 0;
  return { locked: reasons.length > 0 && !overridden, reasons, overridden };
}

export function mvpLessons(index: CurriculumIndex): LessonMeta[] {
  return index.lessons.filter((l) => l.month !== null);
}

export function nextLesson(index: CurriculumIndex, state: AppState): LessonMeta | null {
  const pending = mvpLessons(index).filter((l) => !isComplete(l, lp(state, l.id)));
  return pending.find((l) => !lockInfo(index, state, l).locked) ?? pending[0] ?? null;
}

export function currentMonth(index: CurriculumIndex, state: AppState): number | null {
  const pending = mvpLessons(index).find((l) => !isComplete(l, lp(state, l.id)));
  return pending ? pending.month : null;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Consecutive active days ending today (or yesterday, if today isn't logged yet). */
export function streak(activityDays: string[], now = new Date()): number {
  const days = new Set(activityDays);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(todayKey(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}
