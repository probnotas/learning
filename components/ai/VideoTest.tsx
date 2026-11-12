"use client";
import { useState } from "react";
import { postAI, useAiStatus } from "@/lib/ai-client";
import { lp, type VideoTest as VT } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { getTranscript, useTranscript } from "@/lib/transcripts";
import { useItemCtx } from "../ItemContext";
import { DoneButton } from "../mdx/Items";
import { RichText } from "./RichText";
import { TranscriptBox } from "./TranscriptBox";

/** After every video: a 5-question AI test from its transcript. Passing it completes the video. */
export function VideoTest({ id, title, youtube }: { id: string; title: string; youtube?: string }) {
  const transcript = useTranscript(youtube);
  return <AITest id={id} mode="video" videoTitle={title} transcript={transcript} youtube={youtube} />;
}

/** <Test id="test" title="Lesson test" />: the 4-question end-of-lesson test. Pass it to finish the lesson. */
export function LessonTest({ id }: { id: string; title?: string }) {
  const { meta, activeItem } = useItemCtx();
  if (activeItem !== id) return null;
  const vids = meta.items.filter((i) => i.kind === "video" && i.youtube);
  const withText = vids.filter((v) => getTranscript(v.youtube));
  return (
    <AITest
      id={id}
      mode="lesson"
      videoTitle={withText.map((v) => v.title).join("; ")}
      transcript={withText.map((v) => `## ${v.title}\n${getTranscript(v.youtube)}`).join("\n\n")}
      transcriptNote={vids.length ? `${withText.length} of ${vids.length} video transcripts added` : undefined}
    />
  );
}

function AITest({
  id,
  mode,
  videoTitle,
  transcript,
  youtube,
  transcriptNote,
}: {
  id: string;
  mode: "video" | "lesson";
  videoTitle: string;
  transcript: string;
  youtube?: string;
  transcriptNote?: string;
}) {
  const status = useAiStatus();
  const { meta, context, goNext } = useItemCtx();
  const [state] = useAppState();
  const test = lp(state, meta.id).videoTests?.[id];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLesson = mode === "lesson";

  if (status === null) return <div className="mt-8 h-10" />;
  if (!status.enabled) {
    return (
      <>
        <p className="mt-8 rounded-xl border border-ink-700 bg-ink-900 p-4 text-sm text-ink-300">
          {isLesson ? "The lesson test" : "The after-video test"} needs the AI key (GROQ_API_KEY, see the README). Until it&apos;s set, mark this
          as done.
        </p>
        <DoneButton id={id} label={isLesson ? "Mark lesson test done" : "I watched it, next"} />
      </>
    );
  }

  const save = (t: VT) => updateLesson(meta.id, (x) => ({ ...x, videoTests: { ...(x.videoTests ?? {}), [id]: t } }));

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postAI<{ questions: VT["questions"]; fromTranscript: boolean }>("/api/ai/quiz", {
        mode,
        lessonTitle: meta.title,
        videoTitle,
        transcript,
        context,
      });
      save({ questions: res.questions, picked: res.questions.map(() => null), checked: false, passed: false, fromTranscript: res.fromTranscript });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pick = (qi: number, ci: number) => {
    if (!test || test.passed) return;
    save({ ...test, picked: test.picked.map((p, i) => (i === qi ? ci : p)), checked: false });
  };
  const check = () => {
    if (!test) return;
    save({ ...test, checked: true, passed: test.questions.every((q, i) => test.picked[i] === q.answer) });
  };
  const right = test ? test.questions.filter((q, i) => test.picked[i] === q.answer).length : 0;

  return (
    <section className={isLesson ? "" : "mt-12 border-t border-white/10 pt-10"}>
      {!isLesson && (
        <>
          <h3 className="text-2xl font-bold tracking-tight text-ink-100">Video test</h3>
          <p className="mt-1 text-sm text-ink-300">Get every question right to complete this video. Wrong answers can be retried.</p>
        </>
      )}
      {isLesson && (
        <p className="text-center text-[15px] text-ink-300">
          Four questions on the whole lesson: two concepts, one calculation, one real-world application. Get all four right to pass the lesson.
        </p>
      )}
      {youtube && (
        <div className="mt-5">
          <TranscriptBox videoId={youtube} compact />
        </div>
      )}
      {transcriptNote && <p className="mt-3 text-center text-xs text-ink-400">{transcriptNote}</p>}

      {!test && (
        <div className={`mt-6 flex flex-wrap items-center gap-3 ${isLesson ? "justify-center" : ""}`}>
          <button onClick={generate} disabled={busy} className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-900 disabled:opacity-60">
            {busy ? "Writing your test…" : isLesson ? "Start the lesson test" : "I watched it, give me the test"}
          </button>
          {!isLesson && !transcript && <span className="text-xs text-ink-400">Without a transcript the test covers the video&apos;s main ideas.</span>}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {test && (
        <div className="mt-6 space-y-4">
          {!isLesson && !test.fromTranscript && <p className="text-xs text-warn">Written without the transcript, so it covers the video&apos;s main ideas.</p>}
          {test.questions.map((q, qi) => {
            const pickedIdx = test.picked[qi];
            const wrong = test.checked && pickedIdx !== q.answer;
            const ok = test.checked && pickedIdx === q.answer;
            return (
              <div key={qi} className={`rounded-2xl border bg-ink-900 p-5 ${ok ? "border-good" : wrong ? "border-bad/70" : "border-white/10"}`}>
                <div className="mb-4 flex gap-2 font-semibold text-ink-100">
                  <span>{qi + 1}.</span>
                  <RichText text={q.question} />
                </div>
                <div className="space-y-2">
                  {q.choices.map((c, ci) => {
                    const sel = pickedIdx === ci;
                    const showRight = test.passed && ci === q.answer;
                    return (
                      <div
                        key={ci}
                        role="radio"
                        aria-checked={sel}
                        tabIndex={0}
                        onClick={() => pick(qi, ci)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(qi, ci))}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[15px] transition ${
                          showRight ? "border-good bg-good/10" : sel ? "border-white/60 bg-white/10" : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${sel ? "border-white bg-white" : "border-white/40"}`} />
                        <RichText text={c} className="text-ink-200" />
                      </div>
                    );
                  })}
                </div>
                {test.checked && (ok || test.passed) && <RichText text={`✓ ${q.explanation}`} className="mt-3 text-sm text-good" />}
                {wrong && <p className="mt-3 text-sm text-bad">Not quite. {isLesson ? "Look back through the lesson" : "Rewatch that part or ask the AI"}, then try again.</p>}
              </div>
            );
          })}
          {test.passed ? (
            <div className="rounded-2xl border border-good bg-good/10 p-5 text-center">
              <p className="text-lg font-semibold text-good">
                All {test.questions.length} right. {isLesson ? "Lesson test passed!" : "Video complete!"}
              </p>
              <button onClick={goNext} className="mt-3 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-ink-900">
                {isLesson ? "Back to the campus →" : "Next →"}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={check}
                disabled={test.picked.some((p) => p === null)}
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-50"
              >
                Check answers
              </button>
              {test.checked && (
                <span className="text-sm text-ink-300">
                  {right}/{test.questions.length} right
                </span>
              )}
              <button onClick={generate} disabled={busy} className="ml-auto text-xs text-ink-400 underline hover:text-ink-200">
                {busy ? "Writing…" : "New questions"}
              </button>
            </div>
          )}
          {error && <p className="text-sm text-bad">{error}</p>}
        </div>
      )}
    </section>
  );
}
