"use client";
import { useState } from "react";
import { lp } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { Checkbox } from "../Checkbox";
import { useLesson } from "../LessonContext";

function useWatched(id: string): [boolean, (v: boolean) => void] {
  const meta = useLesson();
  const [state] = useAppState();
  const checked = !!lp(state, meta.id).watched[id];
  return [checked, (v) => updateLesson(meta.id, (x) => ({ ...x, watched: { ...x.watched, [id]: v } }))];
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
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
  const [checked, setChecked] = useWatched(id);
  const [loaded, setLoaded] = useState(false);
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
    <div className="not-prose my-5 rounded-lg border border-ink-800 bg-ink-900 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Checkbox checked={checked} onChange={setChecked} label={<span className="font-medium">▶ {title}</span>} />
        <span className="font-sans text-xs text-ink-400">
          {start !== undefined && `${fmtTime(start)}${end ? `–${fmtTime(end)}` : ""} · `}
          {minutes && `~${minutes} min · `}
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-200">
            open on YouTube
          </a>
        </span>
      </div>
      {children && <div className="mb-2 font-serif text-sm text-ink-300">{children}</div>}
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
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
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 font-sans text-ink-300 hover:text-ink-100"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 text-2xl">▶</span>
            <span className="text-xs">Load video from youtube-nocookie.com</span>
          </button>
        )}
      </div>
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
  const [checked, setChecked] = useWatched(id);
  return (
    <div className="not-prose my-4 rounded-lg border border-ink-800 bg-ink-900 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Checkbox checked={checked} onChange={setChecked} label={<span className="font-medium">📖 {title}</span>} />
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs text-accent underline hover:brightness-125"
        >
          open source ↗
        </a>
      </div>
      {where && <p className="ml-6 mt-1 font-sans text-xs text-ink-400">{where}</p>}
      {children && <div className="ml-6 mt-1 font-serif text-sm text-ink-300">{children}</div>}
    </div>
  );
}
