"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  buildDone,
  canComplete,
  isComplete,
  lessonState,
  lockInfo,
  lp,
  nextLesson,
  problemsDone,
  subtaskFraction,
  watchDone,
} from "@/lib/progress";
import { update, updateLesson, useAppState } from "@/lib/store";
import type { LessonMeta } from "@/lib/types";
import { Checkbox } from "./Checkbox";
import { useIndex } from "./IndexProvider";
import { LessonProvider } from "./LessonContext";
import { GenerateLessonButton } from "./mdx/Draft";
import { ProgressBar, StatusBadge } from "./StatusBadge";

export function LessonShell({
  meta,
  trackTitle,
  topicTitle,
  children,
}: {
  meta: LessonMeta;
  trackTitle: string;
  topicTitle: string;
  children: React.ReactNode;
}) {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  const p = lp(state, meta.id);
  const lock = lockInfo(index, state, meta);
  const st = lessonState(meta, p);

  useEffect(() => {
    update(
      (s) => ({
        ...s,
        lastLessonId: meta.id,
        lessons: { ...s.lessons, [meta.id]: { ...lp(s, meta.id), lastVisited: new Date().toISOString() } },
      }),
      { activity: false },
    );
  }, [meta.id]);

  return (
    <LessonProvider value={meta}>
      <div className="mb-8">
        <p className="font-sans text-sm text-ink-400">
          <Link href={`/track/${meta.track.toLowerCase()}`} className="hover:text-ink-100">
            Track {meta.track} — {trackTitle}
          </Link>
          <span className="mx-2">/</span>
          {topicTitle}
          {meta.month && <span className="ml-3 rounded bg-ink-800 px-1.5 py-0.5 text-xs">Month {meta.month}</span>}
          {meta.hours && <span className="ml-2 text-xs">~{meta.hours} h</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl text-ink-100">{meta.title}</h1>
          {hydrated && <StatusBadge state={st} locked={lock.locked} />}
        </div>
        {meta.summary && <p className="mt-2 max-w-3xl font-serif text-ink-300">{meta.summary}</p>}
        {meta.status === "stub" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warn/30 bg-warn/5 p-3">
            <p className="font-sans text-sm text-warn">
              Draft pending. Watch / Read links are ready. Core ideas, problem set, and build aren&apos;t written yet, so
              this lesson can&apos;t be completed until they are.
            </p>
            <GenerateLessonButton lessonId={meta.id} />
          </div>
        )}
      </div>

      {!hydrated ? (
        <div className="h-96" />
      ) : lock.locked ? (
        <LockedCard meta={meta} reasons={lock.reasons} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            {lock.overridden && (
              <div className="mb-6 rounded-md border border-bad/40 bg-bad/5 p-3 font-sans text-sm text-bad">
                Unlocked anyway. Missing: {lock.reasons.join(" ")}{" "}
                <button
                  className="underline"
                  onClick={() => updateLesson(meta.id, (x) => ({ ...x, override: false }), { activity: false })}
                >
                  Re-lock
                </button>
              </div>
            )}
            <article className="lesson-prose prose prose-invert max-w-none">{children}</article>
            <Notes lessonId={meta.id} initial={p.notes} />
          </div>
          <aside className="lg:sticky lg:top-16 lg:self-start">
            <Checklist meta={meta} />
          </aside>
        </div>
      )}
    </LessonProvider>
  );
}

function LockedCard({ meta, reasons }: { meta: LessonMeta; reasons: string[] }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="max-w-2xl rounded-lg border border-ink-700 bg-ink-900 p-6 font-sans">
      <h2 className="text-lg font-semibold text-ink-100">🔒 This lesson is locked</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-200">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-4 font-serif text-sm text-ink-400">
        Ordering rule: hard dependencies first. Don&apos;t skip ahead.
      </p>
      <button className="mt-6 text-xs text-ink-400 underline hover:text-ink-200" onClick={() => setConfirming(true)}>
        Unlock anyway…
      </button>
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
          <div className="max-w-md rounded-lg border border-ink-700 bg-ink-850 p-6">
            <h3 className="font-semibold text-ink-100">Skip the prerequisites?</h3>
            <p className="mt-2 font-serif text-sm text-ink-300">
              The point of this curriculum is to <em>not</em> skip. If you open this lesson now, it will stay marked as
              unlocked-without-prerequisites until you finish them.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                autoFocus
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-ink-950"
                onClick={() => setConfirming(false)}
              >
                Go back
              </button>
              <button
                className="rounded-md border border-bad/50 px-3 py-1.5 text-sm text-bad hover:bg-bad/10"
                onClick={() => {
                  updateLesson(meta.id, (x) => ({ ...x, override: true }), { activity: false });
                  setConfirming(false);
                }}
              >
                Unlock anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Checklist({ meta }: { meta: LessonMeta }) {
  const index = useIndex();
  const [state] = useAppState();
  const p = lp(state, meta.id);
  const ready = canComplete(meta, p);
  const done = isComplete(meta, p);
  const next = done ? nextLesson(index, state) : null;
  const missing = [
    !watchDone(meta, p) && "watch/read every item",
    !problemsDone(meta, p) && (meta.problemIds.length ? "check off every problem" : "problem set not drafted yet"),
    !buildDone(meta, p) && (meta.hasBuild ? "finish the build (tests must pass)" : "build not drafted yet"),
  ].filter(Boolean) as string[];

  const set = (fn: Parameters<typeof updateLesson>[1]) => updateLesson(meta.id, fn);

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900 p-4 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-100">Checklist</h2>
        <span className="text-xs text-ink-400">{Math.round(subtaskFraction(meta, p) * 100)}%</span>
      </div>
      <ProgressBar value={subtaskFraction(meta, p)} className="mt-2" />

      <h3 className="mt-4 text-xs uppercase tracking-widest text-ink-400">1 · Watch / Read</h3>
      <div className="mt-2 space-y-1.5">
        {meta.watchItems.map((w) => (
          <Checkbox
            key={w.id}
            checked={!!p.watched[w.id]}
            onChange={(v) => set((x) => ({ ...x, watched: { ...x.watched, [w.id]: v } }))}
            label={`${w.kind === "watch" ? "▶" : "📖"} ${w.title}`}
          />
        ))}
      </div>

      <h3 className="mt-4 text-xs uppercase tracking-widest text-ink-400">2 · Problem set</h3>
      {meta.problemIds.length === 0 ? (
        <p className="mt-2 text-xs text-ink-400">Not drafted yet.</p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {meta.problemIds.map((id, i) => (
            <Checkbox
              key={id}
              checked={!!p.problems[id]}
              onChange={(v) => set((x) => ({ ...x, problems: { ...x.problems, [id]: v } }))}
              label={`Problem ${i + 1}`}
            />
          ))}
        </div>
      )}

      <h3 className="mt-4 text-xs uppercase tracking-widest text-ink-400">3 · Build</h3>
      <div className="mt-2">
        {meta.hasBuild ? (
          <Checkbox
            checked={p.buildDone}
            disabled={!p.buildPassed}
            title={p.buildPassed ? "" : "Run the build until every test passes"}
            onChange={(v) => set((x) => ({ ...x, buildDone: v }))}
            label={p.buildPassed ? "Build done" : "Build done (pass the tests first)"}
          />
        ) : (
          <p className="text-xs text-ink-400">Not drafted yet.</p>
        )}
      </div>

      <div className="mt-5 border-t border-ink-800 pt-4">
        {done ? (
          <>
            <p className="text-sm font-semibold text-good">✓ Lesson complete</p>
            {next && (
              <Link href={`/lesson/${next.id}`} className="mt-2 block text-sm text-accent hover:underline">
                Next: {next.title} →
              </Link>
            )}
            <button
              className="mt-3 text-xs text-ink-400 underline"
              onClick={() => set((x) => ({ ...x, completeFlag: false }))}
            >
              Mark incomplete
            </button>
          </>
        ) : (
          <>
            <button
              disabled={!ready}
              onClick={() => set((x) => ({ ...x, completeFlag: true }))}
              className="w-full rounded-md bg-good px-3 py-2 text-sm font-semibold text-ink-950 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400"
            >
              Mark lesson complete
            </button>
            {!ready && <p className="mt-2 text-xs text-ink-400">To finish: {missing.join("; ")}.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Notes({ lessonId, initial }: { lessonId: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setText(initial), [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = (v: string) => {
    setText(v);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updateLesson(lessonId, (x) => ({ ...x, notes: v }));
      setSaved(true);
    }, 500);
  };
  return (
    <section className="mt-12 border-t border-ink-800 pt-6">
      <div className="flex items-baseline justify-between font-sans">
        <h2 className="text-lg font-semibold text-ink-100">My notes</h2>
        <span className="text-xs text-ink-400">{saved ? "Saved locally" : "Saving…"}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What clicked, what didn't, questions for later. Notes show up in your notebook."
        className="mt-3 h-48 w-full rounded-md border border-ink-700 bg-ink-900 p-3 font-serif text-ink-100 placeholder:text-ink-600 focus:border-accent-dim focus:outline-none"
      />
    </section>
  );
}
