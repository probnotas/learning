"use client";
import Link from "next/link";
import {
  currentMonth,
  isComplete,
  lockInfo,
  lp,
  mvpLessons,
  nextLesson,
  streak,
  todayKey,
} from "@/lib/progress";
import { useAppState } from "@/lib/store";
import { useIndex } from "./IndexProvider";
import { InlineMd } from "./InlineMd";
import { LessonRow } from "./LessonRow";
import { ProgressBar } from "./StatusBadge";

export function Dashboard() {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  const { curriculum } = index;
  const mvp = mvpLessons(index);
  const done = mvp.filter((l) => isComplete(l, lp(state, l.id))).length;
  const allDone = index.lessons.filter((l) => isComplete(l, lp(state, l.id))).length;
  const month = currentMonth(index, state);
  const next = nextLesson(index, state);
  const last = state.lastLessonId ? index.lessons.find((l) => l.id === state.lastLessonId) : null;
  const days = streak(state.activityDays);
  const activeToday = state.activityDays.includes(todayKey());

  return (
    <div className="space-y-10">
      <section>
        <p className="font-sans text-xs uppercase tracking-widest text-ink-400">Goal</p>
        <h1 className="mt-1 max-w-3xl font-serif text-2xl leading-snug text-ink-100"><InlineMd text={curriculum.goal} /></h1>
        <p className="mt-3 max-w-3xl font-serif text-ink-300"><InlineMd text={curriculum.learningStyle} /></p>
      </section>

      <section className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${hydrated ? "" : "opacity-0"}`}>
        <Stat label="6-month path" value={`${mvp.length ? Math.round((done / mvp.length) * 100) : 0}%`}>
          <ProgressBar value={mvp.length ? done / mvp.length : 0} className="mt-2" />
          <p className="mt-2 text-xs text-ink-400">
            {done} of {mvp.length} lessons complete · {allDone} of {index.lessons.length} overall
          </p>
        </Stat>
        <Stat label="Current month" value={month ? `Month ${month}` : "Done 🎉"}>
          <p className="mt-2 text-xs text-ink-400">{month ? curriculum.mvp.find((m) => m.month === month)?.focus : "Year 2 awaits."}</p>
        </Stat>
        <Stat label="Streak" value={`${days} day${days === 1 ? "" : "s"}`}>
          <p className="mt-2 text-xs text-ink-400">
            {activeToday ? "You've worked today." : days > 0 ? "Do something today to keep it." : "Check off anything to start one."}
          </p>
        </Stat>
        <div className="flex flex-col justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900 p-4 font-sans">
          {next ? (
            <Link
              href={`/lesson/${next.id}`}
              className="rounded-md bg-accent px-3 py-2 text-center text-sm font-semibold text-ink-950 hover:brightness-110"
            >
              Next up: {next.topic} →
              <span className="block truncate text-xs font-normal">{next.title}</span>
            </Link>
          ) : (
            <span className="text-sm text-good">All path lessons complete.</span>
          )}
          {last && (
            <Link
              href={`/lesson/${last.id}`}
              className="rounded-md border border-ink-700 px-3 py-2 text-center text-sm text-ink-200 hover:border-ink-400"
            >
              Jump back in
              <span className="block truncate text-xs text-ink-400">{last.title}</span>
            </Link>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-sans text-lg font-semibold text-ink-100">Minimum viable path</h2>
        {curriculum.mvpBudget && <p className="mt-1 max-w-3xl font-serif text-sm text-ink-400"><InlineMd text={curriculum.mvpBudget} /></p>}
        <ol className="mt-5 space-y-6">
          {curriculum.mvp.map((m) => {
            const lessons = mvp.filter((l) => l.month === m.month);
            const complete = lessons.filter((l) => isComplete(l, lp(state, l.id))).length;
            const isCurrent = m.month === month;
            return (
              <li
                key={m.month}
                className={`rounded-lg border p-4 ${isCurrent ? "border-accent-dim bg-ink-900" : "border-ink-800"}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-sans font-semibold text-ink-100">
                    Month {m.month} <span className="font-normal text-ink-300">· {m.focus}</span>
                    {isCurrent && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-xs text-accent">current</span>}
                  </h3>
                  <span className="font-sans text-xs text-ink-400">
                    {complete}/{lessons.length} complete
                  </span>
                </div>
                <p className="mt-1 font-serif text-sm text-ink-400"><InlineMd text={m.scope} /></p>
                <ul className="mt-3 space-y-1.5">
                  {lessons.map((l) => (
                    <LessonRow key={l.id} lesson={l} state={state} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-sans text-lg font-semibold text-ink-100">Dependency graph</h2>
          <p className="mt-1 font-serif text-sm text-ink-400">
            Parsed from CURRICULUM.md. Lessons stay locked until their prerequisite topics are complete.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-ink-800 bg-ink-900 p-3 font-mono text-xs text-ink-200">
            {curriculum.graphText}
          </pre>
        </div>
        <div>
          <h2 className="font-sans text-lg font-semibold text-ink-100">Year 2</h2>
          <p className="mt-1 font-serif text-sm text-ink-400"><InlineMd text={curriculum.year2} /></p>
          <ul className="mt-3 space-y-1.5">
            {index.lessons
              .filter((l) => l.month === null)
              .map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 font-sans text-sm">
                  <Link href={`/lesson/${l.id}`} className="truncate text-ink-300 hover:text-ink-100">
                    <span className="mr-2 font-mono text-xs text-ink-400">{l.topic}</span>
                    {l.title}
                  </Link>
                  {lockInfo(index, state, l).locked && <span className="text-xs text-ink-400">🔒</span>}
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900 p-4 font-sans">
      <p className="text-xs uppercase tracking-widest text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-100">{value}</p>
      {children}
    </div>
  );
}
