"use client";
import { topicComplete, topicTitle } from "@/lib/progress";
import { useAppState } from "@/lib/store";
import { useIndex } from "./IndexProvider";
import { InlineMd } from "./InlineMd";
import { LessonRow } from "./LessonRow";

export function TrackView({ trackId }: { trackId: string }) {
  const index = useIndex();
  const [state] = useAppState();
  const track = index.curriculum.tracks.find((t) => t.id === trackId)!;

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-widest text-ink-400">Track {track.id}</p>
      <h1 className="mt-1 font-serif text-3xl text-ink-100">{track.title}</h1>
      <div className="mt-8 space-y-8">
        {track.topics.map((topic) => {
          const lessons = index.lessons.filter((l) => l.topic === topic.id);
          const prereqs = index.curriculum.prereqs[topic.id] ?? [];
          const done = topicComplete(index, state, topic.id);
          const months = [...new Set(lessons.map((l) => l.month).filter((m) => m !== null))];
          return (
            <section key={topic.id} className="rounded-lg border border-ink-800 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-sans text-lg font-semibold text-ink-100">
                  {topic.id}. {topic.title}
                  {done && <span className="ml-2 text-sm text-good">✓ complete</span>}
                </h2>
                <span className="font-sans text-xs text-ink-400">
                  {months.length ? `Path month ${months.join(", ")}` : "Year 2"}
                </span>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 font-serif text-sm text-ink-300">
                {topic.resources.map((r) => (
                  <li key={r}>
                    <InlineMd text={r} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-sans text-xs text-ink-400">
                Prerequisites:{" "}
                {prereqs.length === 0
                  ? "none"
                  : prereqs.map((p, i) => (
                      <span key={p} className={topicComplete(index, state, p) ? "text-good" : "text-warn"}>
                        {i > 0 && ", "}
                        {topicTitle(index, p)}
                      </span>
                    ))}
              </p>
              <ul className="mt-4 space-y-1.5">
                {lessons.map((l) => (
                  <LessonRow key={l.id} lesson={l} state={state} />
                ))}
                {lessons.length === 0 && (
                  <li className="font-sans text-sm text-ink-400">
                    No lesson file yet. Add content/lessons/{topic.trackId.toLowerCase()}-{topic.id.slice(1)}-*.mdx
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
