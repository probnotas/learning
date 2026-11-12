"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { itemDone, lessonPassed, lessonStarted, lockInfo, lp, nextLesson, unitLessons, unitMastery } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { difficulty, siteFor, WORLD_IMAGE, YEAR2_SITE, type Site } from "@/lib/world";
import { earnedXP, lessonXP } from "@/lib/xp";
import { LevelPill, ThemeToggle } from "../Chrome";
import { useIndex } from "../IndexProvider";

const AR = WORLD_IMAGE.width / WORLD_IMAGE.height;

interface Cam {
  X: number;
  Y: number;
  s: number;
}

/** The campus map. Every unit is a building; the card shows one unit at a time and the camera follows it. */
export function World({ initialUnit }: { initialUnit?: string }) {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  const pathUnits = useMemo(() => index.units.filter((u) => unitLessons(index, u).some((l) => l.month !== null)), [index]);
  const year2 = useMemo(() => index.units.filter((u) => !pathUnits.includes(u)), [index, pathUnits]);
  const allUnits = useMemo(() => [...pathUnits, ...year2], [pathUnits, year2]);
  const sites = useMemo(() => Object.fromEntries(index.units.map((u) => [u.topic, siteFor(u.topic)])) as Record<string, Site>, [index]);

  const startIdx = Math.max(0, allUnits.findIndex((u) => u.topic === initialUnit));
  const [cardIdx, setCardIdx] = useState(startIdx);
  const [zoomed, setZoomed] = useState(!!initialUnit);
  const [manual, setManual] = useState<Cam | null>(null); // set while you drag / scroll the map

  // Default card: the unit you should work on next. Then fly in to its building.
  useEffect(() => {
    if (!hydrated) return;
    if (!initialUnit) {
      const next = nextLesson(index, state);
      const i = allUnits.findIndex((u) => u.topic === next?.topic);
      if (i >= 0) setCardIdx(i);
    }
    const t = setTimeout(() => setZoomed(true), 350);
    return () => clearTimeout(t);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const unit = allUnits[Math.min(cardIdx, allUnits.length - 1)];
  const lessons = unit ? unitLessons(index, unit) : [];

  /** Show unit i on the card and fly the camera to its building. */
  const showUnit = useCallback(
    (i: number) => {
      const j = Math.max(0, Math.min(i, allUnits.length - 1));
      setCardIdx(j);
      setZoomed(true);
      setManual(null);
      window.history.replaceState(null, "", `/unit/${allUnits[j].topic.toLowerCase()}`);
    },
    [allUnits],
  );
  const pickTopic = (topic: string) => showUnit(allUnits.findIndex((u) => u.topic === topic));
  const zoomOut = () => {
    setZoomed(false);
    setManual(null);
    window.history.replaceState(null, "", "/");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") zoomOut();
      if (e.key === "ArrowRight") showUnit(cardIdx + 1);
      if (e.key === "ArrowLeft") showUnit(cardIdx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!unit) return null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0d2a3a] font-sans text-white">
      <MapLayer
        sites={sites}
        units={pathUnits}
        year2={year2}
        selected={unit.topic}
        zoomed={zoomed}
        onPick={pickTopic}
        manual={manual}
        setManual={setManual}
        hydrated={hydrated}
      />

      {/* soft vignette so the panels read well over the photo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45))]" />

      <Link href="/" onClick={zoomOut} className="absolute left-8 top-6 text-3xl font-bold tracking-tight drop-shadow-lg">
        learn<span className="text-lime-300">lab</span>
      </Link>
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <LevelPill />
      </div>

      {/* left rail: the card's unit, lesson by lesson, then its project */}
      <nav className="glass absolute left-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 rounded-[22px] p-2">
        {lessons.map((l, i) => {
          const p = lp(state, l.id);
          const lock = hydrated ? lockInfo(index, state, l) : null;
          const passed = hydrated && lessonPassed(l, p);
          return (
            <Link
              key={l.id}
              href={`/lesson/${l.id}`}
              title={`${l.capstone ? "Unit project: " : ""}${l.title}${lock?.locked ? " (locked)" : ""}`}
              className={`relative flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold transition ${
                passed ? "bg-green-500/90 text-white" : l.capstone ? "bg-amber-300/20 text-amber-200 hover:bg-amber-300/30" : "bg-white/10 text-white/85 hover:bg-white/20"
              }`}
            >
              {passed ? "✓" : l.capstone ? "🏆" : String(i + 1).padStart(2, "0")}
              {lock?.locked && <span className="absolute -right-1 -top-1 rounded-full bg-neutral-900 px-1 text-[9px]">🔒</span>}
            </Link>
          );
        })}
        <span className="my-1 h-px w-7 bg-white/20" />
        <Link href="/notes" title="Notebook" className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-white/75 hover:bg-white/15">
          ✎
        </Link>
        <Link href="/projects" title="Portfolio & projects" className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-white/75 hover:bg-white/15">
          ⚒
        </Link>
        <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg text-white/75 hover:bg-white/15" />
      </nav>

      <UnitCard
        unit={unit}
        index={cardIdx}
        count={allUnits.length}
        onPrev={() => showUnit(cardIdx - 1)}
        onNext={() => showUnit(cardIdx + 1)}
        site={sites[unit.topic]}
        hydrated={hydrated}
      />

      {(zoomed || manual) && (
        <button
          onClick={zoomOut}
          title="Back to the whole campus (Esc)"
          className="absolute bottom-28 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-white text-xl text-neutral-900 shadow-lg hover:scale-105"
        >
          ⌖
        </button>
      )}

      <p className="pointer-events-none absolute bottom-[5.6rem] left-6 hidden text-[11px] text-white/60 drop-shadow lg:block">
        Drag to explore · scroll to zoom · ← → to change unit · Esc for the whole campus
      </p>

      {/* bottom bar: units */}
      <div className="glass absolute bottom-6 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full px-3 py-2">
        {pathUnits.map((u, i) => (
          <span key={u.topic} className="flex items-center">
            {i > 0 && <span className="mx-1 h-0.5 w-4 rounded bg-white/25" />}
            <UnitChip unit={u} selected={u.topic === unit.topic} onClick={() => pickTopic(u.topic)} color={sites[u.topic].color} hydrated={hydrated} />
          </span>
        ))}
        <span className="mx-2 h-7 w-px bg-white/25" />
        <span className="mr-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-white/50">Year 2</span>
        {year2.map((u) => (
          <UnitChip key={u.topic} unit={u} small selected={u.topic === unit.topic} onClick={() => pickTopic(u.topic)} color={sites[u.topic].color} hydrated={hydrated} />
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
  manual,
  setManual,
  hydrated,
}: {
  sites: Record<string, Site>;
  units: Unit[];
  year2: Unit[];
  selected: string;
  zoomed: boolean;
  onPick: (topic: string) => void;
  manual: Cam | null;
  setManual: (c: Cam | null) => void;
  hydrated: boolean;
}) {
  const index = useIndex();
  const [state] = useAppState();
  const selectedYear2 = year2.find((u) => u.topic === selected);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; cam: Cam; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Image sized to cover the viewport (like object-fit: cover), so pins stay on their buildings.
  const W = Math.max(vp.w, vp.h * AR);
  const H = W / AR;
  const clamp = (c: Cam): Cam => ({
    s: c.s,
    X: Math.min(0, Math.max(vp.w - c.s * W, c.X)),
    Y: Math.min(0, Math.max(vp.h - c.s * H, c.Y)),
  });

  const site = sites[selected];
  let auto: Cam = { s: 1, X: (vp.w - W) / 2, Y: (vp.h - H) / 2 };
  if (zoomed && site) {
    const s = site.zoom;
    const cardSpace = vp.w > 1024 ? 210 : 0; // keep the building left of the card
    auto = clamp({ s, X: vp.w / 2 - cardSpace - s * site.x * W, Y: vp.h * 0.5 - s * site.y * H });
  }
  const cam = manual ?? auto;
  const { s } = cam;
  const ease = dragging ? "none" : manual ? "transform 0.18s ease-out" : "transform 1.3s cubic-bezier(0.22, 0.8, 0.2, 1)";

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, cam, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(d.id);
    }
    setManual(clamp({ s: d.cam.s, X: d.cam.X + dx, Y: d.cam.Y + dy }));
  };
  const endDrag = () => {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
    setDragging(false);
  };
  const onWheel = (e: React.WheelEvent) => {
    const ns = Math.min(3, Math.max(1, s * Math.exp(-e.deltaY * 0.0015)));
    if (ns === s) return;
    const k = ns / s;
    setManual(clamp({ s: ns, X: e.clientX - (e.clientX - cam.X) * k, Y: e.clientY - (e.clientY - cam.Y) * k }));
  };
  const pinStyle = (x: number, y: number) => ({
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    transform: `translate(-50%, -50%) scale(${1 / s})`,
    transition: ease === "none" ? "none" : "transform 1.3s cubic-bezier(0.22, 0.8, 0.2, 1)",
  });

  return (
    <div
      className={`absolute inset-0 touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `translate(${cam.X}px, ${cam.Y}px) scale(${s})`, transition: ease }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={WORLD_IMAGE.src} alt="Campus map" className="pointer-events-none h-full w-full select-none" draggable={false} />

        {/* light beam on the card's building */}
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

        {/* one pin per building */}
        {units.map((u) => {
          const st = sites[u.topic];
          const isSel = u.topic === selected;
          const first = unitLessons(index, u)[0];
          const locked = hydrated && first ? lockInfo(index, state, first).locked : false;
          const pct = hydrated ? Math.round(unitMastery(index, state, u) * 100) : 0;
          return (
            <button key={u.topic} onClick={() => onPick(u.topic)} className="group absolute" style={pinStyle(st.x, st.y)}>
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
          <button onClick={() => onPick(selectedYear2?.topic ?? year2[0].topic)} className="group absolute" style={pinStyle(YEAR2_SITE.x, YEAR2_SITE.y)}>
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

/** The card: one unit. Before you start it shows what's ahead; after, how you're doing. */
function UnitCard({
  unit,
  index: i,
  count,
  onPrev,
  onNext,
  site,
  hydrated,
}: {
  unit: Unit;
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
  site: Site;
  hydrated: boolean;
}) {
  const index = useIndex();
  const [state] = useAppState();
  const lessons = unitLessons(index, unit);
  const regular = lessons.filter((l) => !l.capstone);
  const capstone = lessons.find((l) => l.capstone);
  const first = lessons[0];
  const lock = hydrated && first ? lockInfo(index, state, first) : { locked: false, reasons: [] as string[], overridden: false };
  const passedCount = hydrated ? regular.filter((l) => lessonPassed(l, lp(state, l.id))).length : 0;
  const started = hydrated && lessons.some((l) => lessonStarted(l, lp(state, l.id)));
  const next = hydrated ? lessons.find((l) => !lessonPassed(l, lp(state, l.id))) : first;
  const mastered = hydrated && lessons.length > 0 && !next;
  const mastery = hydrated ? Math.round(unitMastery(index, state, unit) * 100) : 0;
  const xpTotal = lessons.reduce((s, l) => s + lessonXP(l), 0);
  const xpEarned = hydrated ? lessons.reduce((s, l) => s + earnedXP(l, lp(state, l.id)), 0) : 0;
  const hours = lessons.reduce((s, l) => s + (l.hours ?? 0), 0);
  const diff = difficulty(first?.month ?? null);
  const capP = capstone ? lp(state, capstone.id) : null;
  const capStatus = !capstone
    ? "—"
    : hydrated && capP && lessonPassed(capstone, capP)
      ? "✓ In portfolio"
      : hydrated && capP && capstone.items.some((it) => itemDone(it, capP))
        ? "In progress"
        : hydrated && lockInfo(index, state, capstone).locked
          ? "After the lessons"
          : "Ready";
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

      <div className="mt-5 flex flex-col items-center">
        <div
          className="relative flex h-28 w-56 rotate-[-3deg] flex-col items-center justify-center rounded-2xl border-4 border-white/90 px-3 shadow-xl"
          style={{ background: `linear-gradient(145deg, ${site.color}, ${site.color}99 60%, #0b0f14)` }}
        >
          <span className="absolute -top-3 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-900 shadow">
            Unit {unit.number}
          </span>
          <span className="text-5xl font-black tracking-tight text-white" style={{ WebkitTextStroke: "2px rgba(0,0,0,0.55)", textShadow: "0 4px 0 rgba(0,0,0,0.35)" }}>
            {unit.topic}
          </span>
        </div>
        <p className="mt-3 text-xs text-white/55">{site.building}</p>
        <h2 className="mt-1 text-center text-2xl font-semibold leading-snug">{unit.title}</h2>
        <p className="mt-1 text-center text-sm text-white/60">
          {regular.length} lesson{regular.length === 1 ? "" : "s"}
          {capstone ? " + 🏆 portfolio project" : ""}
        </p>
      </div>

      <dl className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
        {started || mastered ? (
          <>
            <Row label="Mastery">{mastered ? <span className="text-green-300">{mastery}% ✓</span> : `${mastery}%`}</Row>
            <Row label="Lessons passed">
              {passedCount} / {regular.length}
            </Row>
            {capstone && <Row label="Project">{capStatus}</Row>}
            <Row label="XP earned">
              <XpTag n={xpEarned} />
            </Row>
          </>
        ) : (
          <>
            <Row label="Earn XP up to">
              <XpTag n={xpTotal} />
            </Row>
            <Row label="Time">{hours ? `~${hours} hr` : "—"}</Row>
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
              if (first && confirm("Skip the prerequisites? The point of this curriculum is to not skip.")) {
                updateLesson(first.id, (x) => ({ ...x, override: true }), { activity: false });
              }
            }}
            className="mt-2 text-xs text-white/45 underline hover:text-white/80"
          >
            Unlock anyway…
          </button>
        </div>
      ) : (
        <Link
          href={`/lesson/${(next ?? first)?.id ?? ""}`}
          className="mt-5 block w-full rounded-full bg-white py-3.5 text-center text-base font-semibold text-neutral-900 shadow-lg hover:brightness-95"
        >
          {mastered ? "Review" : started ? "Continue" : "Start"}
          {!mastered && next && <span className="mt-0.5 block truncate px-6 text-xs font-normal text-neutral-500">{next.capstone ? "🏆 " : ""}{next.title}</span>}
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
