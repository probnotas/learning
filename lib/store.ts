"use client";
// localStorage-backed app state. One JSON blob under a single key.
import { useEffect, useState, useSyncExternalStore } from "react";
import { EMPTY_LESSON, EMPTY_STATE, todayKey, type AppState, type LessonProgress } from "./progress";

export const STORAGE_KEY = "learnlab:v1";

let state: AppState = EMPTY_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return EMPTY_STATE;
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return EMPTY_STATE;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = readStorage();
    loaded = true;
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        state = readStorage();
        listeners.forEach((l) => l());
      }
    });
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[learnlab] could not save progress", err);
  }
}

export function getState(): AppState {
  ensureLoaded();
  return state;
}

export function setState(next: AppState) {
  ensureLoaded();
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function update(fn: (s: AppState) => AppState, { activity = true } = {}) {
  ensureLoaded();
  let next = fn(state);
  if (activity) {
    const today = todayKey();
    if (!next.activityDays.includes(today)) next = { ...next, activityDays: [...next.activityDays, today] };
  }
  setState(next);
}

export function updateLesson(id: string, fn: (p: LessonProgress) => LessonProgress, opts?: { activity?: boolean }) {
  update((s) => ({ ...s, lessons: { ...s.lessons, [id]: fn(s.lessons[id] ?? EMPTY_LESSON) } }), opts);
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Returns [state, hydrated]. Before hydration the empty state is returned (matches SSR). */
export function useAppState(): [AppState, boolean] {
  const s = useSyncExternalStore(subscribe, getState, () => EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return [hydrated ? s : EMPTY_STATE, hydrated];
}
