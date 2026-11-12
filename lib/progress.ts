// Pure progress / locking logic. No React, no storage — easy to reason about.
import type { CurriculumIndex, ItemMeta, LessonMeta, Unit } from "./types";

export interface Answer {
  values: string[]; // what you typed / picked
  correct: boolean;
  attempts: number;
}

export interface VideoTest {
  questions: { question: string; choices: string[]; answer: number; explanation: string }[];
  picked: (number | null)[];
  checked: boolean;
  passed: boolean;
  fromTranscript: boolean;
  results?: (boolean | null)[]; // per question: true = got it right, false = last try was wrong, null = not tried
}

/** Per-question results, also for tests saved before per-question checking existed. */
export function testResults(t: VideoTest): (boolean | null)[] {
  if (t.results && t.results.length === t.questions.length) return t.results;
  return t.questions.map((q, i) => (t.passed || (t.checked && t.picked[i] === q.answer) ? true : null));
}

export interface PaperDraft {
  sections: Record<string, string>;
  repo: string;
  submitted: boolean;
}

export const PAPER_MIN_WORDS = 40;

export function paperReady(item: ItemMeta, paper: PaperDraft | undefined): boolean {
  if (!paper) return false;
  const words = (t: string | undefined) => (t ?? "").split(/\s+/).filter(Boolean).length;
  return (item.sections ?? []).every((sec) => words(paper.sections[sec]) >= PAPER_MIN_WORDS) && /^https?:\/\/\S+\.\S+/.test(paper.repo.trim());
}

export interface LessonProgress {
  paper?: PaperDraft; // capstone write-up
  videoTests?: Record<string, VideoTest>; // AI-generated test after each video, by item id
  items: Record<string, boolean>; // articles / videos / readings marked done
  answers: Record<string, Answer>; // quiz questions, by question id
  buildPassed: boolean; // build tests passed at least once
  code?: string;
  notes: string;
  override: boolean; // "unlock anyway"
  lastItem?: string;
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
  version: 2;
  lessons: Record<string, LessonProgress>;
  activityDays: string[]; // local YYYY-MM-DD
  lastLessonId: string | null;
  notebook: string;
  buildLog: BuildLogEntry[];
}

export const EMPTY_STATE: AppState = {
  version: 2,
  lessons: {},
  activityDays: [],
  lastLessonId: null,
  notebook: "",
  buildLog: [],
};

export const EMPTY_LESSON: LessonProgress = { items: {}, answers: {}, buildPassed: false, notes: "", override: false };

export function lp(state: AppState, id: string): LessonProgress {
  return state.lessons[id] ?? EMPTY_LESSON;
}

/** Quiz: every question answered correctly. Build: tests passed. Others: marked done. */
export function itemDone(item: ItemMeta, p: LessonProgress): boolean {
  if (item.draft) return false;
  if (item.kind === "quiz") return item.questionIds.length > 0 && item.questionIds.every((q) => p.answers[q]?.correct);
  if (item.kind === "build") return p.buildPassed;
  if ((item.kind === "video" || item.kind === "test") && p.videoTests?.[item.id]?.passed) return true;
  if (item.kind === "milestones") return item.questionIds.length > 0 && item.questionIds.every((m) => p.items[`${item.id}:${m}`]);
  if (item.kind === "paper") return !!p.paper?.submitted && paperReady(item, p.paper);
  return !!p.items[item.id];
}

export function quizScore(item: ItemMeta, p: LessonProgress): { right: number; total: number } {
  return { right: item.questionIds.filter((q) => p.answers[q]?.correct).length, total: item.questionIds.length };
}

/** A lesson passes when every one of its items is done, including every quiz question right. */
export function lessonPassed(meta: LessonMeta, p: LessonProgress): boolean {
  return meta.items.length > 0 && meta.items.every((it) => itemDone(it, p));
}

export function lessonFraction(meta: LessonMeta, p: LessonProgress): number {
  if (!meta.items.length) return 0;
  return meta.items.filter((it) => itemDone(it, p)).length / meta.items.length;
}

export function lessonStarted(meta: LessonMeta, p: LessonProgress): boolean {
  return meta.items.some((it) => itemDone(it, p)) || Object.keys(p.answers).length > 0;
}

export function unitLessons(index: CurriculumIndex, unit: Unit): LessonMeta[] {
  return unit.lessonIds.map((id) => index.lessons.find((l) => l.id === id)!).filter(Boolean);
}

/** Unit mastery = items done / items total across the unit's lessons. */
export function unitMastery(index: CurriculumIndex, state: AppState, unit: Unit): number {
  const items = unitLessons(index, unit).flatMap((l) => l.items.map((it) => itemDone(it, lp(state, l.id))));
  return items.length ? items.filter(Boolean).length / items.length : 0;
}

export function topicComplete(index: CurriculumIndex, state: AppState, topicId: string): boolean {
  const lessons = index.lessons.filter((l) => l.topic === topicId);
  return lessons.length > 0 && lessons.every((l) => lessonPassed(l, lp(state, l.id)));
}

export function topicTitle(index: CurriculumIndex, topicId: string): string {
  const u = index.units.find((x) => x.topic === topicId);
  return u ? `Unit ${u.number}: ${u.title}` : topicId;
}

export interface LockInfo {
  locked: boolean; // effective (after override)
  reasons: string[]; // why it would be locked, even if overridden
  overridden: boolean;
}

export function lockInfo(index: CurriculumIndex, state: AppState, meta: LessonMeta): LockInfo {
  const reasons: string[] = [];
  for (const pre of index.curriculum.prereqs[meta.topic] ?? []) {
    if (!topicComplete(index, state, pre)) reasons.push(`Pass every lesson in ${topicTitle(index, pre)}.`);
  }
  // Within a unit, lessons go in order ("finish one resource before the next").
  const siblings = index.lessons.filter((l) => l.topic === meta.topic).sort((a, b) => a.order - b.order);
  for (const s of siblings) {
    if (s.id === meta.id) break;
    if (!lessonPassed(s, lp(state, s.id))) reasons.push(`Pass "${s.title}" first.`);
  }
  for (const reqId of meta.requires) {
    const req = index.lessons.find((l) => l.id === reqId);
    if (req && !lessonPassed(req, lp(state, req.id)) && !siblings.includes(req)) reasons.push(`Pass "${req.title}" first.`);
  }
  const overridden = lp(state, meta.id).override && reasons.length > 0;
  return { locked: reasons.length > 0 && !overridden, reasons, overridden };
}

export function mvpLessons(index: CurriculumIndex): LessonMeta[] {
  return index.lessons.filter((l) => l.month !== null);
}

export function nextLesson(index: CurriculumIndex, state: AppState): LessonMeta | null {
  const pending = mvpLessons(index).filter((l) => !lessonPassed(l, lp(state, l.id)));
  return pending.find((l) => !lockInfo(index, state, l).locked) ?? pending[0] ?? null;
}

/** First item of a lesson that isn't done yet (or the first item). */
export function nextItem(meta: LessonMeta, p: LessonProgress): ItemMeta | undefined {
  return meta.items.find((it) => !it.draft && !itemDone(it, p)) ?? meta.items[0];
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

/** Parse a typed numeric answer: numbers, fractions, + - * / ^ ( ), pi, sqrt. Returns NaN if invalid. */
export function parseNumber(input: string): number {
  const s = input.trim().toLowerCase().replace(/π/g, "pi").replace(/−/g, "-").replace(/,/g, "");
  if (!s || !/^[0-9.eE+\-*/^() a-z]*$/.test(s)) return NaN;
  if (/[a-z]/.test(s.replace(/\b(pi|sqrt|e(?=[+\-]?\d))\b/g, "").replace(/\d[eE]/g, "0"))) return NaN;
  try {
    const expr = s.replace(/\^/g, "**").replace(/\bpi\b/g, "Math.PI").replace(/\bsqrt\b/g, "Math.sqrt");
    const v = Function(`"use strict"; return (${expr});`)();
    return typeof v === "number" ? v : NaN;
  } catch {
    return NaN;
  }
}

/** Relative tolerance check (absolute when the expected value is 0). */
export function closeEnough(value: number, expected: number, tol: number): boolean {
  if (!isFinite(value)) return false;
  return Math.abs(value - expected) <= tol * Math.max(Math.abs(expected), 1e-12) + (expected === 0 ? tol : 0);
}
