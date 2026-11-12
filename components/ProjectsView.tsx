"use client";
import Link from "next/link";
import { useState } from "react";
import { lp } from "@/lib/progress";
import { PROJECTS } from "@/lib/projects";
import { update, useAppState } from "@/lib/store";
import { useIndex } from "./IndexProvider";

export function ProjectsView() {
  const index = useIndex();
  const [state] = useAppState();
  const [text, setText] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [projectId, setProjectId] = useState("");
  const title = (id: string | null) => index.lessons.find((l) => l.id === id)?.title ?? id;

  const add = () => {
    if (!text.trim()) return;
    update((s) => ({
      ...s,
      buildLog: [
        { id: crypto.randomUUID(), date: new Date().toISOString(), lessonId: lessonId || null, projectId: projectId || null, text: text.trim() },
        ...s.buildLog,
      ],
    }));
    setText("");
  };
  const remove = (id: string) => {
    if (confirm("Delete this log entry?")) update((s) => ({ ...s, buildLog: s.buildLog.filter((e) => e.id !== id) }), { activity: false });
  };

  const builds = index.lessons.filter((l) => l.items.some((i) => i.kind === "build" && !i.draft));

  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-serif text-3xl text-ink-100">Projects</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PROJECTS.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-lg border border-good/40 bg-ink-900 p-5 hover:border-good">
              <h2 className="font-sans text-lg font-semibold text-ink-100">{p.title} →</h2>
              <p className="mt-2 font-serif text-sm text-ink-300">{p.summary}</p>
              <p className="mt-3 font-sans text-xs text-ink-400">Tied to: {p.lessons.map(title).join(" · ")}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-sans text-lg font-semibold text-ink-100">Build log</h2>
        <p className="mt-1 font-serif text-sm text-ink-400">What you built, what broke, what you learned. Saved in this browser.</p>
        <div className="mt-4 rounded-lg border border-ink-800 bg-ink-900 p-4 font-sans">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Fitted k/I, g/L, c/I from sim data. Mass bump shows up as k/I dropping by 1/1.5, g/L unchanged."
            className="h-24 w-full rounded-md border border-ink-700 bg-ink-950 p-3 font-serif text-ink-100 placeholder:text-ink-600 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-200">
              <option value="">No lesson</option>
              {index.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.topic} · {l.title}
                </option>
              ))}
            </select>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-200">
              <option value="">No project</option>
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button onClick={add} className="ml-auto rounded-md bg-accent px-3 py-1.5 font-semibold text-ink-900">
              Add entry
            </button>
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          {state.buildLog.map((e) => (
            <li key={e.id} className="rounded-lg border border-ink-800 p-4">
              <div className="flex flex-wrap items-center gap-2 font-sans text-xs text-ink-400">
                <span>{new Date(e.date).toLocaleString()}</span>
                {e.lessonId && (
                  <Link href={`/lesson/${e.lessonId}`} className="text-accent hover:underline">
                    {title(e.lessonId)}
                  </Link>
                )}
                {e.projectId && <span className="text-good">{PROJECTS.find((p) => p.id === e.projectId)?.title}</span>}
                <button onClick={() => remove(e.id)} className="ml-auto hover:text-bad">
                  delete
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap font-serif text-ink-200">{e.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-sans text-lg font-semibold text-ink-100">Lesson builds</h2>
        <ul className="mt-3 divide-y divide-ink-800 rounded-lg border border-ink-800 font-sans text-sm">
          {builds.map((l) => {
            const p = lp(state, l.id);
            return (
              <li key={l.id} className="flex items-center justify-between gap-2 px-4 py-2">
                <Link href={`/lesson/${l.id}/build`} className="truncate text-ink-200 hover:text-ink-100">
                  <span className="mr-2 font-mono text-xs text-ink-400">{l.topic}</span>
                  {l.title}
                </Link>
                <span className={`text-xs ${p.buildPassed ? "text-good" : p.code ? "text-warn" : "text-ink-400"}`}>
                  {p.buildPassed ? "✓ passed" : p.code ? "in progress" : "not started"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
