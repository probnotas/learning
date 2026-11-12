"use client";
import Link from "next/link";
import { lessonState, lockInfo, lp, subtaskFraction } from "@/lib/progress";
import type { LessonMeta } from "@/lib/types";
import type { AppState } from "@/lib/progress";
import { useIndex } from "./IndexProvider";
import { ProgressBar, StatusBadge } from "./StatusBadge";

export function LessonRow({ lesson, state }: { lesson: LessonMeta; state: AppState }) {
  const index = useIndex();
  const p = lp(state, lesson.id);
  const lock = lockInfo(index, state, lesson);
  const st = lessonState(lesson, p);
  return (
    <li className="group relative">
      <Link
        href={`/lesson/${lesson.id}`}
        className={`flex items-center gap-3 rounded-md border border-ink-800 bg-ink-900 px-3 py-2.5 transition-colors hover:border-ink-600 ${
          lock.locked ? "opacity-60" : ""
        }`}
      >
        <span className="w-8 shrink-0 font-mono text-xs text-ink-400">{lesson.topic}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-sm text-ink-100">{lesson.title}</span>
          <span className="mt-1 flex items-center gap-2">
            <ProgressBar value={subtaskFraction(lesson, p)} className="max-w-40" />
            {lesson.status === "stub" && <span className="font-sans text-[11px] text-ink-400">draft pending</span>}
            {lesson.hours && <span className="font-sans text-[11px] text-ink-400">~{lesson.hours} h</span>}
          </span>
        </span>
        <StatusBadge state={st} locked={lock.locked} />
      </Link>
      {lock.reasons.length > 0 && (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-10 top-full z-20 mt-1 hidden w-80 rounded-md border border-ink-700 bg-ink-850 p-2 font-sans text-xs text-ink-200 shadow-lg group-hover:block"
        >
          <div className="mb-1 font-semibold text-warn">
            {lock.overridden ? "Unlocked anyway — prerequisites still missing:" : "Locked — missing prerequisites:"}
          </div>
          <ul className="list-disc pl-4">
            {lock.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
