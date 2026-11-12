"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { update, useAppState } from "@/lib/store";
import { useIndex } from "./IndexProvider";

export function NotesView() {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (hydrated) setText(state.notebook);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (v: string) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update((s) => ({ ...s, notebook: v })), 500);
  };

  const q = query.trim().toLowerCase();
  const lessonNotes = index.lessons
    .map((l) => ({ lesson: l, notes: state.lessons[l.id]?.notes ?? "" }))
    .filter((x) => x.notes.trim() && (!q || x.notes.toLowerCase().includes(q) || x.lesson.title.toLowerCase().includes(q)));

  const exportAll = () => {
    const md = [
      "# learnlab notebook\n",
      state.notebook,
      ...index.lessons
        .filter((l) => state.lessons[l.id]?.notes?.trim())
        .map((l) => `\n## ${l.topic} — ${l.title}\n\n${state.lessons[l.id].notes}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `learnlab-notes-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-3xl text-ink-100">Notebook</h1>
          <button onClick={exportAll} className="rounded-md border border-ink-700 px-3 py-1.5 font-sans text-sm text-ink-300 hover:border-ink-400">
            Export all notes (.md)
          </button>
        </div>
        <p className="mt-1 font-serif text-ink-400">
          Cross-lesson scratch space: connections, open questions, things to ask Revzen. Saved in this browser.
        </p>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 'Mass bump lowers ω_n, so whether amplitude goes up or down depends on which side of resonance I'm driving...'"
          className="mt-4 h-72 w-full rounded-md border border-ink-700 bg-ink-900 p-4 font-serif text-ink-100 placeholder:text-ink-600 focus:border-accent-dim focus:outline-none"
        />
      </section>
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-sans text-lg font-semibold text-ink-100">Lesson notes</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1 font-sans text-sm text-ink-100 focus:outline-none"
          />
        </div>
        {lessonNotes.length === 0 ? (
          <p className="mt-3 font-serif text-ink-400">No lesson notes yet. Each lesson has a “My notes” box at the bottom.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {lessonNotes.map(({ lesson, notes }) => (
              <li key={lesson.id} className="rounded-lg border border-ink-800 bg-ink-900 p-4">
                <Link href={`/lesson/${lesson.id}`} className="font-sans text-sm font-semibold text-accent hover:underline">
                  {lesson.topic} · {lesson.title}
                </Link>
                <p className="mt-2 whitespace-pre-wrap font-serif text-ink-200">{notes}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
