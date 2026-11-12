// XP is derived from progress (never stored), so it can't drift out of sync.
import { itemDone, lp, type AppState, type LessonProgress } from "./progress";
import type { CurriculumIndex, ItemMeta, LessonMeta } from "./types";

export const XP_PER_LEVEL = 1000;

function itemXP(it: ItemMeta): number {
  if (it.draft) return 0;
  switch (it.kind) {
    case "video": return 20;
    case "article": return 10;
    case "reading": return 30;
    case "quiz": return 25 * it.questionIds.length;
    case "build": return 150;
  }
}

export function lessonXP(meta: LessonMeta): number {
  return meta.items.reduce((s, it) => s + itemXP(it), 0);
}

export function earnedXP(meta: LessonMeta, p: LessonProgress): number {
  return meta.items.reduce((s, it) => {
    if (it.draft) return s;
    if (it.kind === "quiz") return s + 25 * it.questionIds.filter((q) => p.answers[q]?.correct).length;
    return s + (itemDone(it, p) ? itemXP(it) : 0);
  }, 0);
}

export function totalXP(index: CurriculumIndex, state: AppState): number {
  return index.lessons.reduce((s, l) => s + earnedXP(l, lp(state, l.id)), 0);
}

export function level(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL);
}
