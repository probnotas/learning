"use client";
import Link from "next/link";
import { useState } from "react";
import { setTranscript, useTranscript, wordCount } from "@/lib/transcripts";

/** Shows whether a video has a transcript, and lets you paste one in. */
export function TranscriptBox({ videoId, compact }: { videoId: string; compact?: boolean }) {
  const transcript = useTranscript(videoId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const words = wordCount(transcript);
  return (
    <div className={`rounded-xl border border-ink-700 bg-ink-900 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={transcript ? "text-good" : "text-ink-300"}>
          {transcript ? `✓ Transcript added (${words.toLocaleString()} words)` : "No transcript yet"}
        </span>
        <button
          onClick={() => {
            setDraft(transcript);
            setOpen((o) => !o);
          }}
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-ink-100 hover:bg-white/20"
        >
          {open ? "Close" : transcript ? "Edit transcript" : "Add transcript"}
        </button>
      </div>
      {!transcript && !open && (
        <p className="mt-2 text-xs text-ink-400">
          Add it so the test, notes check and Ask AI use exactly what the video says.
        </p>
      )}
      {open && (
        <div className="mt-3">
          <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-xs text-ink-300">
            <li>Open the video on YouTube (link under the player).</li>
            <li>Under the video, click <strong>…more</strong>, then <strong>Show transcript</strong>.</li>
            <li>Select all the transcript text, copy it, and paste it here. Timestamps are fine.</li>
          </ol>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste the transcript here…"
            className="h-40 w-full rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-xs text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => {
                setTranscript(videoId, draft);
                setOpen(false);
              }}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-ink-900"
            >
              Save
            </button>
            {transcript && (
              <button
                onClick={() => {
                  setTranscript(videoId, "");
                  setDraft("");
                }}
                className="text-xs text-ink-400 underline hover:text-ink-200"
              >
                Remove
              </button>
            )}
            <span className="text-[11px] text-ink-400">Saved in this browser only.</span>
            <Link href="/transcripts" className="ml-auto text-xs text-ink-300 underline hover:text-ink-100">
              Import many at once
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
