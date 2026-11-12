"use client";
import { useEffect, useRef, useState } from "react";
import { postAI, streamChat, useAiStatus } from "@/lib/ai-client";
import { updateLesson } from "@/lib/store";
import { getTranscript, useTranscript } from "@/lib/transcripts";
import type { LessonMeta } from "@/lib/types";
import { RichText } from "./RichText";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** Right-hand panel: Notes (with an AI check) and Ask AI (chat grounded in the video transcript). */
export function StudyPanel({
  meta,
  activeItem,
  context,
  initialNotes,
  hydrated,
}: {
  meta: LessonMeta;
  activeItem: string;
  context: string;
  initialNotes: string;
  hydrated: boolean;
}) {
  const [tab, setTab] = useState<"notes" | "ask">("notes");
  const status = useAiStatus();
  const item = meta.items.find((i) => i.id === activeItem);
  const video = item?.kind === "video" ? item : null;
  const transcript = useTranscript(video?.youtube);

  // On a video page use its transcript; elsewhere, every transcript saved for this lesson.
  const source = () => {
    if (video) return { videoTitle: video.title, transcript };
    const vids = meta.items.filter((i) => i.kind === "video" && i.youtube && getTranscript(i.youtube));
    return {
      videoTitle: vids.length ? vids.map((v) => v.title).join("; ") : undefined,
      transcript: vids.map((v) => `## ${v.title}\n${getTranscript(v.youtube)}`).join("\n\n"),
    };
  };

  return (
    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-[32px] border border-ink-800 bg-ink-900 shadow-sm">
      <div className="flex items-center gap-1 bg-ink-850 px-4 py-3">
        {(["notes", "ask"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-ink-900 text-ink-100 shadow-sm" : "text-ink-400 hover:text-ink-200"}`}
          >
            {t === "notes" ? "🗒️ Notes" : "✦ Ask AI"}
          </button>
        ))}
        <span className="ml-auto pr-2 text-[11px] text-ink-400">
          {video ? (transcript ? "transcript ✓" : "no transcript") : ""}
        </span>
      </div>
      {tab === "notes" ? (
        <Notes meta={meta} initial={initialNotes} hydrated={hydrated} aiEnabled={!!status?.enabled} context={context} source={source} />
      ) : (
        <Ask meta={meta} aiEnabled={!!status?.enabled} context={context} source={source} hasTranscript={!!source().transcript} />
      )}
    </section>
  );
}

function Notes({
  meta,
  initial,
  hydrated,
  aiEnabled,
  context,
  source,
}: {
  meta: LessonMeta;
  initial: string;
  hydrated: boolean;
  aiEnabled: boolean;
  context: string;
  source: () => { videoTitle?: string; transcript: string };
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (hydrated) setText(initial);
  }, [hydrated, meta.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await postAI<{ feedback: string }>("/api/ai/notes", { notes: text, lessonTitle: meta.title, context, ...source() });
      setFeedback(res.feedback);
    } catch (e) {
      setFeedback(`⚠ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <textarea
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setSaved(false);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            updateLesson(meta.id, (x) => ({ ...x, notes: v }));
            setSaved(true);
          }, 500);
        }}
        placeholder={"Take notes while you watch and work.\n\nThey're saved for this lesson and collected in your notebook."}
        className="min-h-[180px] flex-1 resize-none bg-transparent px-6 py-5 font-serif text-[15px] leading-relaxed text-ink-100 placeholder:text-ink-400 focus:outline-none"
      />
      {feedback && (
        <div className="max-h-[45%] overflow-y-auto border-t border-ink-800 bg-ink-850 px-6 py-4 text-sm text-ink-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-400">Notes check</span>
            <button onClick={() => setFeedback(null)} className="text-xs text-ink-400 hover:text-ink-200">
              ✕
            </button>
          </div>
          <RichText text={feedback} />
        </div>
      )}
      <div className="flex items-center gap-3 border-t border-ink-800 px-5 py-3">
        <span className="text-xs text-ink-400">{saved ? "Saved" : "Saving…"}</span>
        <button
          onClick={check}
          disabled={!aiEnabled || busy || !text.trim()}
          title={aiEnabled ? "Have the AI compare your notes with the video and lesson" : "Set ANTHROPIC_API_KEY to enable"}
          className="ml-auto rounded-full bg-ink-800 px-4 py-2 text-sm font-semibold text-ink-100 hover:bg-ink-700 disabled:opacity-40"
        >
          {busy ? "Checking…" : "✦ Check my notes"}
        </button>
      </div>
    </div>
  );
}

function Ask({
  meta,
  aiEnabled,
  context,
  source,
  hasTranscript,
}: {
  meta: LessonMeta;
  aiEnabled: boolean;
  context: string;
  source: () => { videoTitle?: string; transcript: string };
  hasTranscript: boolean;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    // (Newer browsers return a Promise from scrollIntoView, so don't return it from the effect.)
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs]);
  useEffect(() => () => abort.current?.abort(), []);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      await streamChat(
        { messages: next, lessonTitle: meta.title, context, ...source() },
        (text) => setMsgs([...next, { role: "assistant", content: text }]),
        abort.current.signal,
      );
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: `⚠ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  if (!aiEnabled) {
    return (
      <div className="p-6 text-sm text-ink-300">
        Ask AI needs an API key. Set <code className="font-mono">ANTHROPIC_API_KEY</code> (see README → AI features) and restart the app.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-[180px] flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {msgs.length === 0 && (
          <div className="text-sm text-ink-400">
            <p>Ask anything about this video or lesson while you watch.</p>
            <p className="mt-2">
              {hasTranscript
                ? "Answers use the video transcript and the lesson text."
                : "No transcript yet: answers use the lesson text and general knowledge. Add the transcript under the video for answers grounded in exactly what was said."}
            </p>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-accent/15 px-4 py-2.5 text-sm text-ink-100">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-4 text-sm leading-relaxed text-ink-200">
              {m.content ? <RichText text={m.content} /> : <span className="text-ink-400">Thinking…</span>}
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-ink-800 p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="e.g. Why do the columns tell you where the basis vectors land?"
          className="flex-1 resize-none rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-50">
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
