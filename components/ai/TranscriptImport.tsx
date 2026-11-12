"use client";
import Link from "next/link";
import { useState } from "react";
import { importCollection, setTranscript, useAllTranscripts, wordCount } from "@/lib/transcripts";
import { useIndex } from "../IndexProvider";

/** Paste a whole document of transcripts at once; each section is matched to its video by YouTube link. */
export function TranscriptImport() {
  const index = useIndex();
  const all = useAllTranscripts();
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const videos = index.lessons.flatMap((l) =>
    l.items.filter((it) => it.kind === "video" && it.youtube).map((it) => ({ lesson: l, item: it, id: it.youtube! })),
  );
  const have = videos.filter((v) => all[v.id]).length;

  const run = () => {
    try {
      const ids = importCollection(draft);
      const known = ids.filter((id) => videos.some((v) => v.id === id)).length;
      setMsg(ids.length ? `Saved ${ids.length} transcript${ids.length === 1 ? "" : "s"} (${known} match a lesson video).` : "No transcripts found. Each section needs its YouTube link.");
      if (ids.length) setDraft("");
    } catch {
      setMsg("Couldn't save: this browser's storage is full or blocked.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <h2 className="text-lg font-semibold text-ink-100">Paste a transcript collection</h2>
        <p className="mt-1 text-sm text-ink-300">
          Paste a whole document with one section per video. Each section is matched to its video by the YouTube link in it.
          Transcripts are saved in this browser only, and are never committed to the repo.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste the whole document here…"
          className="mt-3 h-56 w-full rounded-xl border border-ink-700 bg-ink-950 p-3 font-mono text-xs text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button disabled={!draft.trim()} onClick={run} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-ink-950 disabled:opacity-40">
            Import transcripts
          </button>
          {msg && <span className="text-sm text-ink-200">{msg}</span>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink-100">
          Lesson videos <span className="text-sm font-normal text-ink-400">· {have} of {videos.length} have a transcript</span>
        </h2>
        <ul className="mt-3 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-900">
          {videos.map((v) => (
            <li key={`${v.lesson.id}/${v.item.id}`} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className={all[v.id] ? "text-good" : "text-ink-600"}>{all[v.id] ? "✓" : "○"}</span>
              <Link href={`/lesson/${v.lesson.id}/${v.item.id}`} className="min-w-0 flex-1 truncate text-ink-100 hover:underline">
                {v.item.title} <span className="text-ink-400">· {v.lesson.title}</span>
              </Link>
              {all[v.id] && (
                <>
                  <span className="text-xs text-ink-400">{wordCount(all[v.id]).toLocaleString()} words</span>
                  <button onClick={() => setTranscript(v.id, "")} className="text-xs text-ink-400 underline hover:text-ink-200">
                    Remove
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
