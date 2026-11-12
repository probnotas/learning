"use client";
// Top-level MDX items. Every item renders only when it's the active one, so one lesson
// file becomes a sequence of mini-lesson pages.
import { useState } from "react";
import { lp } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { useItemCtx } from "../ItemContext";
import { VideoTest } from "../ai/VideoTest";
import { GenerateLessonButton } from "./Draft";

function useActive(id: string) {
  const ctx = useItemCtx();
  return { ...ctx, active: ctx.activeItem === id };
}

function useDone(id: string): [boolean, (v: boolean) => void] {
  const { meta } = useItemCtx();
  const [state] = useAppState();
  return [!!lp(state, meta.id).items[id], (v) => updateLesson(meta.id, (x) => ({ ...x, items: { ...x.items, [id]: v } }))];
}

export function DoneButton({ id, label }: { id: string; label: string }) {
  const { goNext } = useItemCtx();
  const [done, setDone] = useDone(id);
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink-800 pt-6">
      <button
        onClick={() => {
          setDone(true);
          goNext();
        }}
        className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900 hover:brightness-110"
      >
        {done ? "Next →" : `${label} →`}
      </button>
      {done && (
        <button onClick={() => setDone(false)} className="text-xs text-ink-400 underline hover:text-ink-200">
          Mark as not done
        </button>
      )}
    </div>
  );
}

export function Article({ id, draft, children }: { id: string; title: string; draft?: boolean; children?: React.ReactNode }) {
  const { active, meta } = useActive(id);
  if (!active) return null;
  if (draft) {
    return (
      <div className="rounded-lg border-2 border-dashed border-ink-700 p-6">
        <p className="font-semibold text-ink-100">This article isn&apos;t written yet</p>
        <p className="mt-1 font-serif text-ink-400">Not yet drafted — generate on demand.</p>
        <div className="mt-4">
          <GenerateLessonButton lessonId={meta.id} />
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="lesson-prose prose max-w-none">{children}</div>
      <DoneButton id={id} label="Got it, next" />
    </>
  );
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** YouTube embed behind a click-to-load facade: nothing is fetched from YouTube until you press play. */
export function Watch({
  id,
  title,
  youtube,
  playlist,
  start,
  end,
  minutes,
  children,
}: {
  id: string;
  title: string;
  youtube?: string;
  playlist?: string;
  start?: number;
  end?: number;
  minutes?: number;
  children?: React.ReactNode;
}) {
  const { active } = useActive(id);
  const [loaded, setLoaded] = useState(false);
  if (!active) return null;
  const params = new URLSearchParams({ rel: "0", autoplay: "1" });
  if (start) params.set("start", String(start));
  if (end) params.set("end", String(end));
  const src = youtube
    ? `https://www.youtube-nocookie.com/embed/${youtube}?${params}`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${playlist}&rel=0&autoplay=1`;
  const href = youtube
    ? `https://www.youtube.com/watch?v=${youtube}${start ? `&t=${start}s` : ""}`
    : `https://www.youtube.com/playlist?list=${playlist}`;
  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {loaded ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setLoaded(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 hover:text-white"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl">▶</span>
            <span className="text-xs">Play (loads from youtube-nocookie.com)</span>
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-400">
        {start !== undefined && `${fmtTime(start)}${end ? `–${fmtTime(end)}` : ""} · `}
        {minutes && `~${minutes} min · `}
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-200">
          open on YouTube
        </a>
      </p>
      {children && <div className="lesson-prose prose mt-4 max-w-none">{children}</div>}
      <VideoTest id={id} title={title} youtube={youtube} />
    </div>
  );
}

export function Read({
  id,
  title,
  href,
  where,
  children,
}: {
  id: string;
  title: string;
  href: string;
  where?: string;
  children?: React.ReactNode;
}) {
  const { active } = useActive(id);
  if (!active) return null;
  return (
    <div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border-2 border-ink-700 bg-ink-900 p-5 hover:border-accent"
      >
        <span className="text-xs uppercase tracking-widest text-ink-400">Free source · opens in a new tab</span>
        <span className="mt-1 block text-lg font-semibold text-accent">{title} ↗</span>
        {where && <span className="mt-2 block font-serif text-ink-300">{where}</span>}
      </a>
      {children && <div className="lesson-prose prose mt-5 max-w-none">{children}</div>}
      <DoneButton id={id} label="I read it, next" />
    </div>
  );
}

export { Quiz, Q, Choice, Solution } from "./Quiz";

/** The build item: intro text from MDX, then the editor. Passed when every test passes. */
export function BuildItem({
  id,
  draft,
  children,
  panel,
}: {
  id: string;
  title: string;
  draft?: boolean;
  children?: React.ReactNode;
  panel: React.ReactNode;
}) {
  const { meta, activeItem, goNext } = useItemCtx();
  const [state] = useAppState();
  if (activeItem !== id) return null;
  const passed = lp(state, meta.id).buildPassed;
  return (
    <div>
      {children && <div className="lesson-prose prose max-w-none">{children}</div>}
      {draft ? (
        <div className="mt-4 rounded-lg border-2 border-dashed border-ink-700 p-6">
          <p className="font-semibold text-ink-100">This build isn&apos;t written yet</p>
          <p className="mt-1 font-serif text-ink-400">The lesson can&apos;t be passed until it exists.</p>
          <div className="mt-4">
            <GenerateLessonButton lessonId={meta.id} />
          </div>
        </div>
      ) : (
        panel
      )}
      {passed && (
        <div className="mt-6 rounded-lg border-2 border-good bg-good/10 p-5">
          <p className="text-lg font-semibold text-good">Every test passes. Build complete!</p>
          <button onClick={goNext} className="mt-3 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
