"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { itemDone, lessonPassed, lockInfo, lp, nextItem, nextLesson } from "@/lib/progress";
import { update, updateLesson, useAppState } from "@/lib/store";
import type { LessonMeta, Unit } from "@/lib/types";
import { siteFor } from "@/lib/world";
import { BackButton, LevelPill, ThemeToggle } from "./Chrome";
import { KIND_LABEL } from "./Icons";
import { StudyPanel } from "./ai/StudyPanel";
import { useIndex } from "./IndexProvider";
import { ItemProvider } from "./ItemContext";

/** One lesson = a big card that plays its items in order (video, article, practice, build),
 *  with story-style progress segments, and a notes panel beside it. */
export function LessonStage({
  meta,
  unit,
  activeItem,
  context,
  children,
}: {
  meta: LessonMeta;
  unit: Unit;
  activeItem: string;
  context: string;
  children: React.ReactNode;
}) {
  const index = useIndex();
  const router = useRouter();
  const [state, hydrated] = useAppState();
  const p = lp(state, meta.id);
  const lock = lockInfo(index, state, meta);
  const idx = meta.items.findIndex((i) => i.id === activeItem);
  const item = meta.items[idx];
  const passed = lessonPassed(meta, p);
  const worldHref = `/unit/${unit.topic.toLowerCase()}`;
  const color = siteFor(unit.topic).color;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    update(
      (s) => ({
        ...s,
        lastLessonId: meta.id,
        lessons: { ...s.lessons, [meta.id]: { ...lp(s, meta.id), lastItem: activeItem, lastVisited: new Date().toISOString() } },
      }),
      { activity: false },
    );
    scroller.current?.scrollTo(0, 0);
  }, [meta.id, activeItem]);

  const href = (itemId: string) => `/lesson/${meta.id}/${itemId}`;
  const prev = meta.items[idx - 1];
  const next = meta.items[idx + 1];
  const goNext = () => router.push(next ? href(next.id) : worldHref);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, .monaco-editor, [contenteditable]")) return;
      if (e.key === "ArrowRight" && next) router.push(href(next.id));
      if (e.key === "ArrowLeft" && prev) router.push(href(prev.id));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nextUp = passed ? nextLesson(index, state) : null;

  return (
    <ItemProvider value={{ meta, activeItem, context, goNext }}>
      <div className="flex min-h-screen flex-col bg-ink-950 font-sans lg:h-screen">
        {/* top row */}
        <div className="flex items-center gap-4 px-6 pb-4 pt-6 lg:px-10">
          <BackButton href={worldHref} label="Back to the campus" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">
              Unit {unit.number} · {unit.title}
            </p>
            <h1 className="truncate font-display text-lg font-semibold text-ink-100">{meta.title}</h1>
          </div>
          <ThemeToggle className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-800 bg-ink-900 text-lg text-ink-200 shadow-sm hover:bg-ink-850" />
          <LevelPill light />
        </div>

        <div className="grid min-h-0 flex-1 gap-6 px-6 pb-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10 lg:pb-8">
          {/* the stage */}
          <section className="stage relative flex min-h-[70vh] flex-col overflow-hidden rounded-[32px] shadow-xl lg:min-h-0">
            <div className="flex items-center justify-between px-8 pt-7">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white shadow"
                style={{ background: color }}
                title={`Unit ${unit.number}: ${unit.title}`}
              >
                {unit.topic}
              </span>
              {item && (
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-ink-300">
                  {KIND_LABEL[item.kind]} · {idx + 1}/{meta.items.length}
                </span>
              )}
            </div>

            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-4 lg:px-14">
              {!hydrated ? null : lock.locked ? (
                <LockedCard lessonId={meta.id} reasons={lock.reasons} />
              ) : (
                <div className="mx-auto max-w-3xl">
                  {lock.overridden && (
                    <div className="mb-6 rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
                      Unlocked without prerequisites: {lock.reasons.join(" ")}{" "}
                      <button className="underline" onClick={() => updateLesson(meta.id, (x) => ({ ...x, override: false }), { activity: false })}>
                        Re-lock
                      </button>
                    </div>
                  )}
                  {item && <h2 className="mb-6 text-center font-display text-3xl font-bold tracking-tight text-ink-100 lg:text-4xl">{item.title}</h2>}
                  {children}
                  {passed && !next && (
                    <div className="mt-8 rounded-2xl border-2 border-good bg-good/10 p-5 text-center">
                      <p className="text-lg font-semibold text-good">Lesson passed ✓</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-3">
                        <Link href={worldHref} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-ink-100 hover:bg-white/20">
                          Back to the campus
                        </Link>
                        {nextUp && nextUp.id !== meta.id && (
                          <Link href={`/lesson/${nextUp.id}`} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900">
                            Next: {nextUp.title} →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* story-style segments: one per item */}
            <div className="flex items-center gap-3 px-8 pb-6 pt-2">
              <Link
                href={prev ? href(prev.id) : "#"}
                aria-disabled={!prev}
                className={`text-xl text-ink-300 ${prev ? "hover:text-ink-100" : "pointer-events-none opacity-30"}`}
              >
                ‹
              </Link>
              <div className="flex flex-1 gap-1.5">
                {meta.items.map((it, i) => {
                  const done = hydrated && itemDone(it, p);
                  return (
                    <Link
                      key={it.id}
                      href={href(it.id)}
                      title={`${i + 1}. ${it.title}${it.draft ? " (not written yet)" : ""}`}
                      className="group flex-1 py-2"
                    >
                      <span
                        className={`block h-1.5 rounded-full transition ${
                          i === idx ? "bg-white" : done ? "bg-white/80" : it.draft ? "bg-white/10" : "bg-white/25 group-hover:bg-white/45"
                        } ${i === idx ? "ring-2 ring-accent/60" : ""}`}
                      />
                    </Link>
                  );
                })}
              </div>
              <Link
                href={next ? href(next.id) : "#"}
                aria-disabled={!next}
                className={`text-xl text-ink-300 ${next ? "hover:text-ink-100" : "pointer-events-none opacity-30"}`}
              >
                ›
              </Link>
            </div>
          </section>

          {/* notes + ask AI */}
          <StudyPanel meta={meta} activeItem={activeItem} context={context} initialNotes={p.notes} hydrated={hydrated} />
        </div>
      </div>
    </ItemProvider>
  );
}

/** /lesson/[id] → jump to the first unfinished item. */
export function LessonRedirect({ meta }: { meta: LessonMeta }) {
  const router = useRouter();
  const [state, hydrated] = useAppState();
  useEffect(() => {
    if (!hydrated) return;
    const it = nextItem(meta, lp(state, meta.id));
    if (it) router.replace(`/lesson/${meta.id}/${it.id}`);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="h-screen bg-ink-950" />;
}

function LockedCard({ lessonId, reasons }: { lessonId: string; reasons: string[] }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-ink-700 bg-ink-900 p-6">
      <h2 className="text-lg font-semibold text-ink-100">🔒 This lesson is locked</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-200">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-4 font-serif text-sm text-ink-400">Ordering rule: hard dependencies first. Don&apos;t skip ahead.</p>
      <button className="mt-6 text-xs text-ink-400 underline hover:text-ink-200" onClick={() => setConfirming(true)}>
        Unlock anyway…
      </button>
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
          <div className="max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-6">
            <h3 className="font-semibold text-ink-100">Skip the prerequisites?</h3>
            <p className="mt-2 font-serif text-sm text-ink-300">
              The point of this curriculum is to <em>not</em> skip. The lesson stays marked as unlocked-without-prerequisites
              until you pass them.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button autoFocus className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-ink-900" onClick={() => setConfirming(false)}>
                Go back
              </button>
              <button
                className="rounded-full border border-bad/50 px-4 py-1.5 text-sm text-bad hover:bg-bad/10"
                onClick={() => {
                  updateLesson(lessonId, (x) => ({ ...x, override: true }), { activity: false });
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
