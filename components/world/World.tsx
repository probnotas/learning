"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { itemDone, lessonPassed, lessonStarted, lockInfo, lp, nextLesson, unitLessons, unitMastery } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import type { LessonMeta, Unit } from "@/lib/types";
import { difficulty, siteFor, WORLD_IMAGE, YEAR2_SITE, type Site } from "@/lib/world";
import { earnedXP, lessonXP } from "@/lib/xp";
import { useIndex } from "../IndexProvider";
import { LevelPill, ThemeToggle } from "../Chrome";

const AR = WORLD_IMAGE.width / WORLD_IMAGE.height;

/** The campus map: units are buildings; pick one and the camera flies in. */
export function World({ initialUnit }: { initialUnit?: string }) {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  const pathUnits = useMemo(() => index.units.filter((u) => unitLessons(index, u).some((l) => l.month !== null)), [index]);
  const year2 = useMemo(() => index.units.filter((u) => !pathUnits.includes(u)), [index, pathUnits]);
  const sites = useMemo(() => {
    const m: Record<string, Site> = {};
    index.units.forEach((u) => (m[u.topic] = siteFor(u.topic)));
    return m;
  }, [index]);

  const [selected, setSelected] = useState<string | null>(initialUnit ?? null);
  const [zoomed, setZoomed] = useState(!!initialUnit);
  const [lessonIdx, setLessonIdx] = useState(0);

  // Default selection: the unit (and lesson) you should do next.
  useEffect(() => {
    if (!hydrated) return;
    const next = nextLesson(index, state);
    const topic = initialUnit ?? next?.topic ?? index.units[0]?.topic;
    if (!topic) return;
    setSelected(topic);
    const unit = index.units.find((u) => u.topic === topic)!;
    const lessons = unitLessons(index, unit);
    const i = lessons.findIndex((l) => !lessonPassed(l, lp(state, l.id)));
    setLessonIdx(i < 0 ? 0 : i);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectUnit = useCallback(
    (topic: string, zoom = true) => {
      setSelected(topic);
      setZoomed(zoom);
      const unit = index.units.find((u) => u.topic === topic)!;
      const lessons = unitLessons(index, unit);
      const i = lessons.findIndex((l) => !lessonPassed(l, lp(state, l.id)));
      setLessonIdx(i < 0 ? 0 : i);
      window.history.replaceState(null, "", zoom ? `/unit/${topic.toLowerCase()}` : "/");
    },
    [index, state],
  );

  const unit = index.units.find((u) => u.topic === selected) ?? null;
  const lessons = unit ? unitLessons(index, unit) : [];
  const lesson = lessons[Math.min(lessonIdx, Math.max(0, lessons.length - 1))];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomed(false);
        window.history.replaceState(null, "", "/");
      }
      if (e.key === "ArrowRight") setLessonIdx((i) => Math.min(i + 1, lessons.length - 1));
      if (e.key === "ArrowLeft") setLessonIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lessons.length]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0d2a3a] font-sans text-white">
      <MapLayer
        sites={sites}
        units={pathUnits}
        year2={year2}
        selected={selected}
        zoomed={zoomed}
        onPick={(t) => selectUnit(t)}
        hydrated={hydrated}
      />

      {/* soft vignette so the panels read well over the photo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45))]" />

      {/* top bar */}
      <Link href="/" onClick={() => setZoomed(false)} className="absolute left-8 top-6 text-3xl font-bold tracking-tight drop-shadow-lg">
        learn<span className="text-lime-300">lab</span>
      </Link>
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <LevelPill />
      </div>

      {/* left rail: lessons in the selected unit, then tools */}
      <nav className="glass absolute left-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 rounded-[22px] p-2">
        {lessons.map((l, i) => {
          const p = lp(state, l.id);
          const lock = hydrated ? lockInfo(index, state, l) : null;
          const passed = hydrated && lessonPassed(l, p);
          const active = i === lessonIdx;
          return (
            <button
              key={l.id}
              title={l.title}
              onClick={() => {
                setLessonIdx(i);
                if (unit && !zoomed) selectUnit(unit.topic);
              }}
              className={`relative flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold transition ${
                active ? "bg-white text-neutral-900" : passed ? "bg-green-500/90 text-white" : "bg-white/10 text-white/85 hover:bg-white/20"
              }`}
            >
              {passed ? "✓" : String(i + 1).padStart(2, "0")}
              {lock?.locked && <span className="absolute -right-1 -top-1 rounded-full bg-neutral-900 px-1 text-[9px]">🔒</span>}
            </button>
          );
        })}
        <span className="my-1 h-px w-7 bg-white/20" />
        <Link href="/notes" title="Notebook" className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-white/75 hover:bg-white/15">
          ✎
        </Link>
        <Link href="/projects" title="Projects" className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-white/75 hover:bg-white/15">
          ⚒
        </Link>
        <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-white/75 hover:bg-white/15" />
      </nav>

      {/* right card: the selected lesson */}
      {unit && lesson && (
        <LessonCard
          unit={unit}
          lesson={lesson}
          index={lessonIdx}
          count={lessons.length}
          onPrev={() => setLessonIdx((i) => Math.max(0, i - 1))}
          onNext={() => setLessonIdx((i) => Math.min(lessons.length - 1, i + 1))}
          site={sites[unit.topic]}
          hydrated={hydrated}
        />
      )}

      {/* recenter */}
      {zoomed && (
        <button
          onClick={() => {
            setZoomed(false);
            window.history.replaceState(null, "", "/");
          }}
          title="Back to the whole campus (Esc)"
          className="absolute bottom-28 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-white text-xl text-neutral-900 shadow-lg hover:scale-105"
        >
          ⌖
        </button>
      )}

      {/* bottom bar: units */}
      <div className="glass absolute bottom-6 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full px-3 py-2">
        {pathUnits.map((u, i) => (
          <span key={u.topic} className="flex items-center">
            {i > 0 && <span className="mx-1 h-0.5 w-4 rounded bg-white/25" />}
            <UnitChip unit={u} selected={u.topic === selected} onClick={() => selectUnit(u.topic)} color={sites[u.topic].color} hydrated={hydrated} />
          </span>
        ))}
        <span className="mx-2 h-7 w-px bg-white/25" />
        <span className="mr-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-white/50">Year 2</span>
        {year2.map((u) => (
          <UnitChip key={u.topic} unit={u} small selected={u.topic === selected} onClick={() => selectUnit(u.topic)} color={sites[u.topic].color} hydrated={hydrated} />
        ))}
      </div>
    </div>
  );
}

function MapLayer({
  sites,
  units,
  year2,
  selected,
  zoomed,
  onPick,
  hydrated,
}: {
  sites: Record<string, Site>;
  units: Unit[];
  year2: Unit[];
  selected: string | null;
  zoomed: boolean;
  onPick: (topic: string) => void;
  hydrated: boolean;
}) {
  const index = useIndex();
  const selectedYear2 = year2.find((u) => u.topic === selected);
  const [state] = useAppState();
  const ref = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Image sized to cover the viewport (like object-fit: cover), so pins stay on their buildings.
  const W = Math.max(vp.w, vp.h * AR);
  const H = W / AR;
  const site = selected ? sites[selected] : null;
  let s = 1, X = (vp.w - W) / 2, Y = (vp.h - H) / 2;
  if (zoomed && site) {
    s = site.zoom;
    const cardSpace = vp.w > 1024 ? 210 : 0; // keep the building left of the lesson card
    X = vp.w / 2 - cardSpace - s * site.x * W;
    Y = vp.h * 0.5 - s * site.y * H;
    X = Math.min(0, Math.max(vp.w - s * W, X));
    Y = Math.min(0, Math.max(vp.h - s * H, Y));
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 origin-top-left"
      style={{
        width: W,
        height: H,
        transform: `translate(${X}px, ${Y}px) scale(${s})`,
        transition: "transform 1.3s cubic-bezier(0.22, 0.8, 0.2, 1)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={WORLD_IMAGE.src} alt="Campus map" className="h-full w-full select-none" draggable={false} />

      {/* light beam on the selected building */}
      {site && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${site.x * 100}%`,
            top: 0,
            height: `${site.y * 100}%`,
            width: 80 / s,
            transform: "translateX(-50%)",
            background: "linear-gradient(to bottom, rgba(190,242,100,0) 0%, rgba(190,242,100,0.35) 55%, rgba(220,255,200,0.85) 100%)",
            filter: "blur(6px)",
            mixBlendMode: "screen",
            animation: "beam 3s ease-in-out infinite",
          }}
        />
      )}

      {/* building pins */}
      {units.map((u) => {
        const st = sites[u.topic];
        const isSel = u.topic === selected;
        const first = unitLessons(index, u)[0];
        const locked = hydrated && first ? lockInfo(index, state, first).locked : false;
        const pct = hydrated ? Math.round(unitMastery(index, state, u) * 100) : 0;
        return (
          <button
            key={u.topic}
            onClick={() => onPick(u.topic)}
            className="group absolute"
            style={{ left: `${st.x * 100}%`, top: `${st.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / s})`, transition: "transform 1.3s cubic-bezier(0.22, 0.8, 0.2, 1)" }}
          >
            {isSel && <span className="absolute inset-0 rounded-full bg-white/60" style={{ animation: "ping-soft 1.8s ease-out infinite" }} />}
            <span
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg ${
                isSel ? "border-white bg-white text-neutral-900" : "border-white/80 text-white"
              } ${locked && !isSel ? "opacity-70" : ""}`}
              style={isSel ? undefined : { background: `${st.color}cc` }}
            >
              {pct === 100 ? "✓" : u.topic}
            </span>
            {(!zoomed || isSel) && (
              <span className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur group-hover:bg-black/75">
                {locked ? "🔒 " : ""}
                {u.title}
                {pct > 0 && pct < 100 ? ` · ${pct}%` : ""}
              </span>
            )}
          </button>
        );
      })}

      {/* one pin for the whole Year 2 district */}
      {year2.length > 0 && (
        <button
          onClick={() => onPick(selectedYear2?.topic ?? year2[0].topic)}
          className="group absolute"
          style={{
            left: `${YEAR2_SITE.x * 100}%`,
            top: `${YEAR2_SITE.y * 100}%`,
            transform: `translate(-50%, -50%) scale(${1 / s})`,
            transition: "transform 1.3s cubic-bezier(0.22, 0.8, 0.2, 1)",
          }}
        >
          {selectedYear2 && <span className="absolute inset-0 rounded-full bg-white/60" style={{ animation: "ping-soft 1.8s ease-out infinite" }} />}
          <span
            className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed text-xs font-bold shadow-lg ${
              selectedYear2 ? "border-white bg-white text-neutral-900" : "border-white/80 bg-slate-500/70 text-white"
            }`}
          >
            {selectedYear2 ? selectedYear2.topic : "Y2"}
          </span>
          {(!zoomed || selectedYear2) && (
            <span className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              {selectedYear2 ? `${selectedYear2.title} · planned` : `Year 2 district · ${year2.length} units`}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function UnitChip({
  unit,
  selected,
  onClick,
  color,
  small,
  hydrated,
}: {
  unit: Unit;
  selected: boolean;
  onClick: () => void;
  color: string;
  small?: boolean;
  hydrated: boolean;
}) {
  const index = useIndex();
  const [state] = useAppState();
  const pct = hydrated ? unitMastery(index, state, unit) : 0;
  const first = unitLessons(index, unit)[0];
  const locked = hydrated && first ? lockInfo(index, state, first).locked : false;
  const size = small ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-xs";
  return (
    <button onClick={onClick} title={`Unit ${unit.number}: ${unit.title}${locked ? " (locked)" : ""}`} className="group relative shrink-0">
      <span
        className={`flex ${size} items-center justify-center rounded-full font-bold transition ${
          selected ? "ring-[3px] ring-lime-300 ring-offset-2 ring-offset-transparent" : ""
        } ${pct === 1 ? "bg-green-500 text-white" : "text-white"} ${locked ? "opacity-45" : ""}`}
        style={pct === 1 ? undefined : { background: selected ? color : `${color}66` }}
      >
        {pct === 1 ? "✓" : unit.topic}
      </span>
      {pct > 0 && pct < 1 && (
        <svg className="pointer-events-none absolute inset-0" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="20" fill="none" stroke="#bef264" strokeWidth="3" strokeDasharray={`${pct * 125.6} 125.6`} transform="rotate(-90 22 22)" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function LessonCard({
  unit,
  lesson,
  index: i,
  count,
  onPrev,
  onNext,
  site,
  hydrated,
}: {
  unit: Unit;
  lesson: LessonMeta;
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  site: Site;
  hydrated: boolean;
}) {
  const index = useIndex();
  const [state] = useAppState();
  const p = lp(state, lesson.id);
  const lock = hydrated ? lockInfo(index, state, lesson) : { locked: false, reasons: [], overridden: false };
  const passed = hydrated && lessonPassed(lesson, p);
  const started = hydrated && lessonStarted(lesson, p);
  const diff = difficulty(lesson.month);
  const done = lesson.items.filter((it) => itemDone(it, p)).length;
  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <aside className="glass absolute right-6 top-1/2 w-[400px] max-w-[calc(100vw-3rem)] -translate-y-1/2 rounded-[28px] p-5">
      <div className="flex items-center justify-between">
        <button onClick={onPrev} disabled={i === 0} className="h-9 w-9 rounded-full text-lg text-white/80 hover:bg-white/10 disabled:opacity-30">
          ‹
        </button>
        <span className="rounded-full bg-white/10 px-4 py-1.5 font-mono text-sm text-white/85">
          {fmt(i + 1)} <span className="text-white/40">/</span> {fmt(count)}
        </span>
        <button onClick={onNext} disabled={i >= count - 1} className="h-9 w-9 rounded-full text-lg text-white/80 hover:bg-white/10 disabled:opacity-30">
          ›
        </button>
      </div>

      {/* unit badge */}
      <div className="mt-5 flex flex-col items-center">
        <div
          className="relative flex h-28 w-56 rotate-[-3deg] flex-col items-center justify-center rounded-2xl border-4 border-white/90 px-3 shadow-xl"
          style={{ background: `linear-gradient(145deg, ${site.color}, ${site.color}99 60%, #0b0f14)` }}
        >
          <span className="absolute -top-3 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-900 shadow">
            Unit {unit.number}
          </span>
          <span
            className="text-5xl font-black tracking-tight text-white"
            style={{ WebkitTextStroke: "2px rgba(0,0,0,0.55)", textShadow: "0 4px 0 rgba(0,0,0,0.35)" }}
          >
            {unit.topic}
          </span>
          <span className="mt-0.5 line-clamp-1 text-center text-[11px] font-bold uppercase tracking-wide text-white/90">
            {unit.title.split(" — ")[0]}
          </span>
        </div>
        <p className="mt-3 text-xs text-white/55">{site.building}</p>
        <h2 className="mt-2 text-center text-xl font-semibold leading-snug">{lesson.title}</h2>
      </div>

      <dl className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
        {started || passed ? (
          <>
            <Row label="Performance">{passed ? <span className="text-green-300">Passed ✓</span> : "In progress"}</Row>
            <Row label="Items done">
              {done} / {lesson.items.length}
            </Row>
            <Row label="XP earned">
              <XpTag n={earnedXP(lesson, p)} />
            </Row>
          </>
        ) : (
          <>
            <Row label="Earn XP up to">
              <XpTag n={lessonXP(lesson)} />
            </Row>
            <Row label="Time">{lesson.hours ? `~${lesson.hours} hr` : "—"}</Row>
            <Row label="Difficulty">
              <span className="flex items-center gap-3">
                <span className="flex gap-1">
                  {[1, 2, 3].map((b) => (
                    <span key={b} className={`h-1.5 w-5 rounded-full ${b <= diff.bars ? "bg-white" : "bg-white/20"}`} />
                  ))}
                </span>
                {diff.label}
              </span>
            </Row>
          </>
        )}
      </dl>

      {lock.locked ? (
        <div className="mt-5">
          <div className="flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3.5 text-base text-white/70">🔒 Locked</div>
          <ul className="mt-3 space-y-1 text-xs text-white/60">
            {lock.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          <button
            onClick={() => {
              if (confirm("Skip the prerequisites? The point of this curriculum is to not skip.")) {
                updateLesson(lesson.id, (x) => ({ ...x, override: true }), { activity: false });
              }
            }}
            className="mt-2 text-xs text-white/45 underline hover:text-white/80"
          >
            Unlock anyway…
          </button>
        </div>
      ) : (
        <Link
          href={`/lesson/${lesson.id}`}
          className="mt-5 block w-full rounded-full bg-white py-3.5 text-center text-base font-semibold text-neutral-900 shadow-lg hover:brightness-95"
        >
          {passed ? "Review" : started ? "Continue" : "Start"}
          {lesson.status === "stub" && <span className="ml-2 text-xs font-normal text-neutral-500">(draft)</span>}
        </Link>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-xs uppercase tracking-widest text-white/50">{label}</dt>
      <dd className="text-white/90">{children}</dd>
    </div>
  );
}

export function XpTag({ n }: { n: number }) {
  return (
    <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 font-mono text-sm text-amber-200">✦ {n}</span>
  );
}
