"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { itemDone, lessonFraction, lessonPassed, lockInfo, lp, nextItem, nextLesson } from "@/lib/progress";
import { update, updateLesson, useAppState } from "@/lib/store";
import type { LessonMeta, Unit } from "@/lib/types";
import { ItemIcon, KIND_LABEL } from "./Icons";
import { useIndex } from "./IndexProvider";
import { ItemProvider } from "./ItemContext";
import { ProgressBar } from "./ProgressBar";

export function ItemPlayer({
  meta,
  unit,
  activeItem,
  children,
}: {
  meta: LessonMeta;
  unit: Unit;
  activeItem: string;
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

  useEffect(() => {
    update(
      (s) => ({
        ...s,
        lastLessonId: meta.id,
        lessons: { ...s.lessons, [meta.id]: { ...lp(s, meta.id), lastItem: activeItem, lastVisited: new Date().toISOString() } },
      }),
      { activity: false },
    );
    window.scrollTo(0, 0);
  }, [meta.id, activeItem]);

  const href = (itemId: string) => `/lesson/${meta.id}/${itemId}`;
  const goNext = () => {
    const after = meta.items.slice(idx + 1).find((i) => !i.draft) ?? meta.items[idx + 1];
    if (after) router.push(href(after.id));
    else router.push(`/unit/${unit.topic.toLowerCase()}`);
  };
  const prev = meta.items[idx - 1];
  const next = meta.items[idx + 1];
  const nextUp = passed ? nextLesson(index, state) : null;

  return (
    <ItemProvider value={{ meta, activeItem, goNext }}>
      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Lesson sidebar */}
        <aside className="border-ink-800 bg-ink-900 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:border-r">
          <div className="border-b border-ink-800 p-5">
            <Link href={`/unit/${unit.topic.toLowerCase()}`} className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline">
              ← Unit {unit.number}: {unit.title}
            </Link>
            <h1 className="mt-2 text-lg font-semibold leading-snug text-ink-100">{meta.title}</h1>
            {hydrated && (
              <>
                <ProgressBar value={lessonFraction(meta, p)} className="mt-3" />
                <p className="mt-1.5 text-xs text-ink-400">
                  {passed ? (
                    <span className="font-semibold text-good">✓ Lesson passed</span>
                  ) : (
                    `${meta.items.filter((i) => itemDone(i, p)).length} of ${meta.items.length} done`
                  )}
                  {meta.month && ` · Month ${meta.month}`}
                  {meta.hours && ` · ~${meta.hours} h`}
                </p>
              </>
            )}
          </div>
          <nav className="py-2">
            {meta.items.map((it) => {
              const done = hydrated && itemDone(it, p);
              const active = it.id === activeItem;
              return (
                <Link
                  key={it.id}
                  href={href(it.id)}
                  className={`flex items-center gap-3 border-l-4 px-4 py-2.5 text-sm ${
                    active ? "border-accent bg-accent/10 text-ink-100" : "border-transparent text-ink-300 hover:bg-ink-850"
                  }`}
                >
                  <ItemIcon kind={it.kind} done={done} draft={it.draft} />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">{it.title}</span>
                    <span className="text-[11px] text-ink-400">
                      {KIND_LABEL[it.kind]}
                      {it.kind === "quiz" && !it.draft && ` · ${it.questionIds.length} questions`}
                      {it.draft && " · not written yet"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <Notes lessonId={meta.id} initial={p.notes} hydrated={hydrated} />
        </aside>

        {/* Item content */}
        <div className="min-w-0 px-5 py-8 lg:px-12">
          {!hydrated ? (
            <div className="h-96" />
          ) : lock.locked ? (
            <LockedCard lessonId={meta.id} reasons={lock.reasons} />
          ) : (
            <div className="mx-auto max-w-3xl">
              {lock.overridden && (
                <div className="mb-6 rounded-md border border-bad/40 bg-bad/5 p-3 text-sm text-bad">
                  Unlocked without prerequisites: {lock.reasons.join(" ")}{" "}
                  <button className="underline" onClick={() => updateLesson(meta.id, (x) => ({ ...x, override: false }), { activity: false })}>
                    Re-lock
                  </button>
                </div>
              )}
              {item && (
                <header className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">{KIND_LABEL[item.kind]}</p>
                  <h2 className="mt-1 font-serif text-3xl text-ink-100">{item.title}</h2>
                </header>
              )}
              {children}
              {passed && nextUp && nextUp.id !== meta.id && idx === meta.items.length - 1 && (
                <div className="mt-6 rounded-lg border-2 border-accent/50 bg-accent/5 p-5">
                  <p className="font-semibold text-ink-100">Lesson passed. Up next: {nextUp.title}</p>
                  <Link href={`/lesson/${nextUp.id}`} className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
                    Start it →
                  </Link>
                </div>
              )}
              <div className="mt-12 flex justify-between gap-3 border-t border-ink-800 pt-5 text-sm">
                {prev ? (
                  <Link href={href(prev.id)} className="text-ink-400 hover:text-ink-100">
                    ← {prev.title}
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link href={href(next.id)} className="text-right text-ink-400 hover:text-ink-100">
                    {next.title} →
                  </Link>
                )}
              </div>
            </div>
          )}
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
  return <div className="h-96" />;
}

function LockedCard({ lessonId, reasons }: { lessonId: string; reasons: string[] }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mx-auto max-w-xl rounded-lg border-2 border-ink-700 bg-ink-900 p-6">
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
          <div className="max-w-md rounded-lg border border-ink-700 bg-ink-900 p-6">
            <h3 className="font-semibold text-ink-100">Skip the prerequisites?</h3>
            <p className="mt-2 font-serif text-sm text-ink-300">
              The point of this curriculum is to <em>not</em> skip. The lesson stays marked as unlocked-without-prerequisites
              until you pass them.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button autoFocus className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-ink-900" onClick={() => setConfirming(false)}>
                Go back
              </button>
              <button
                className="rounded-md border border-bad/50 px-3 py-1.5 text-sm text-bad hover:bg-bad/10"
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

function Notes({ lessonId, initial, hydrated }: { lessonId: string; initial: string; hydrated: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (hydrated) setText(initial);
  }, [hydrated, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="border-t border-ink-800 p-4">
      <button onClick={() => setOpen((o) => !o)} className="text-sm font-semibold text-ink-300 hover:text-ink-100">
        {open ? "▾" : "▸"} My notes{initial ? " ●" : ""}
      </button>
      {open && (
        <textarea
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => updateLesson(lessonId, (x) => ({ ...x, notes: v })), 500);
          }}
          placeholder="What clicked, what didn't. Shows up in your notebook."
          className="mt-2 h-40 w-full rounded-md border border-ink-700 bg-ink-950 p-2 font-serif text-sm text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
        />
      )}
    </div>
  );
}
