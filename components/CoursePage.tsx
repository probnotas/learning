"use client";
import Link from "next/link";
import { itemDone, lessonPassed, lessonStarted, lockInfo, lp, nextItem, nextLesson, unitLessons, unitMastery } from "@/lib/progress";
import { useAppState } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { ItemIcon } from "./Icons";
import { useIndex } from "./IndexProvider";

/** Khan-style course view: units on the left, the selected unit's lessons and items on the right. */
export function CoursePage({ unitTopic }: { unitTopic?: string }) {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  const next = nextLesson(index, state);
  const upNextUnit = index.units.find((u) => u.topic === next?.topic) ?? index.units[0];
  const unit = index.units.find((u) => u.topic === unitTopic) ?? upNextUnit;
  const isUpNext = unit.topic === upNextUnit.topic;
  const pathUnits = index.units.filter((u) => unitLessons(index, u).some((l) => l.month !== null));
  const laterUnits = index.units.filter((u) => !pathUnits.includes(u));
  const resume = state.lastLessonId ? index.lessons.find((l) => l.id === state.lastLessonId) : null;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      {/* Units sidebar */}
      <aside className="self-start overflow-hidden rounded-lg border border-ink-800 bg-ink-900">
        <div className="flex items-center gap-3 border-l-4 border-accent bg-accent/10 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-xl text-ink-900">⚙</span>
          <div>
            <p className="font-semibold leading-tight text-accent">Self-model robotics</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{index.units.length} units</p>
          </div>
        </div>
        <UnitList units={pathUnits} activeTopic={unit.topic} />
        <p className="border-t border-ink-800 px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
          Year 2
        </p>
        <UnitList units={laterUnits} activeTopic={unit.topic} />
      </aside>

      {/* Selected unit */}
      <section className="min-w-0">
        {hydrated && resume && (
          <Link
            href={`/lesson/${resume.id}`}
            className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900 px-4 py-3 text-sm hover:border-accent"
          >
            <span className="text-ink-300">
              Continue where you left off: <span className="font-semibold text-ink-100">{resume.title}</span>
            </span>
            <span className="font-semibold text-accent">Jump back in →</span>
          </Link>
        )}
        <div className="rounded-lg border border-ink-800 border-t-4 border-t-accent bg-ink-900 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-800 pb-4">
            <h1 className="text-xl text-ink-100">
              {isUpNext && <span className="mr-2 text-accent">Up next for you:</span>}
              <span className="font-semibold">
                Unit {unit.number}: {unit.title}
              </span>
            </h1>
            {hydrated && <span className="text-sm text-ink-300">Unit mastery: {Math.round(unitMastery(index, state, unit) * 100)}%</span>}
          </div>
          <UnitBody unit={unit} hydrated={hydrated} />
        </div>
      </section>
    </div>
  );
}

function UnitList({ units, activeTopic }: { units: Unit[]; activeTopic: string }) {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  return (
    <ul>
      {units.map((u) => {
        const active = u.topic === activeTopic;
        const pct = Math.round(unitMastery(index, state, u) * 100);
        return (
          <li key={u.topic} className="border-t border-ink-800 first:border-t-0">
            <Link
              href={`/unit/${u.topic.toLowerCase()}`}
              className={`block border-l-4 px-4 py-3 ${active ? "border-accent bg-accent/5" : "border-transparent hover:bg-ink-850"}`}
            >
              <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Unit {u.number}
                {hydrated && pct > 0 && <span className={pct === 100 ? "text-good" : ""}>{pct}%</span>}
              </span>
              <span className={`block ${active ? "font-semibold text-ink-100" : "text-ink-200"}`}>{u.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UnitBody({ unit, hydrated }: { unit: Unit; hydrated: boolean }) {
  const index = useIndex();
  const [state] = useAppState();
  const lessons = unitLessons(index, unit);
  if (!lessons.length) return <p className="mt-6 text-ink-400">No lessons in this unit yet.</p>;
  return (
    <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
      {lessons.map((l) => {
        const p = lp(state, l.id);
        const lock = hydrated ? lockInfo(index, state, l) : { locked: false, reasons: [], overridden: false };
        const passed = hydrated && lessonPassed(l, p);
        const target = nextItem(l, p);
        return (
          <div key={l.id} className={`group relative ${lock.locked ? "opacity-60" : ""}`}>
            <Link href={`/lesson/${l.id}${target ? `/${target.id}` : ""}`} className="flex items-start gap-2 hover:underline">
              <h2 className="text-lg font-semibold leading-snug text-ink-100">
                {lock.locked && "🔒 "}
                {l.title}
              </h2>
            </Link>
            <p className="mb-3 mt-0.5 text-xs text-ink-400">
              {passed ? (
                <span className="font-semibold text-good">✓ Passed</span>
              ) : hydrated && lessonStarted(l, p) ? (
                <span className="text-accent">In progress</span>
              ) : lock.locked ? (
                "Locked"
              ) : (
                "Not started"
              )}
              {l.month && ` · Month ${l.month}`}
              {l.hours && ` · ~${l.hours} h`}
              {l.status === "stub" && " · draft"}
            </p>
            <ul className="space-y-1">
              {l.items.map((it) => (
                <li key={it.id}>
                  <Link href={`/lesson/${l.id}/${it.id}`} className="flex items-center gap-3 rounded py-1 text-ink-300 hover:text-ink-100">
                    <ItemIcon kind={it.kind} done={hydrated && itemDone(it, p)} draft={it.draft} />
                    <span className={`leading-snug ${it.draft ? "text-ink-400" : ""}`}>{it.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {lock.reasons.length > 0 && (
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-8 z-20 hidden w-80 rounded-md border border-ink-700 bg-ink-850 p-3 text-xs text-ink-200 shadow-lg group-hover:block"
              >
                <p className="mb-1 font-semibold text-warn">{lock.overridden ? "Unlocked anyway. Still missing:" : "Locked. Missing:"}</p>
                <ul className="list-disc pl-4">
                  {lock.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
