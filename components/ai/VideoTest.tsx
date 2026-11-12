"use client";
import { useState } from "react";
import { postAI, useAiStatus } from "@/lib/ai-client";
import { lp, type VideoTest as VT } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { useTranscript } from "@/lib/transcripts";
import { useItemCtx } from "../ItemContext";
import { DoneButton } from "../mdx/Items";
import { RichText } from "./RichText";
import { TranscriptBox } from "./TranscriptBox";

/** After every video: an AI-written test from the transcript. Passing it completes the video. */
export function VideoTest({ id, title, youtube }: { id: string; title: string; youtube?: string }) {
  const status = useAiStatus();
  const { meta, context, goNext } = useItemCtx();
  const [state] = useAppState();
  const transcript = useTranscript(youtube);
  const test = lp(state, meta.id).videoTests?.[id];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === null) return <div className="mt-8 h-10" />;
  if (!status.enabled) {
    return (
      <>
        <p className="mt-8 rounded-xl border border-ink-700 bg-ink-900 p-3 text-xs text-ink-400">
          The after-video test is off because no AI key is set (see README → AI features). Until then, mark the video as watched.
        </p>
        <DoneButton id={id} label="I watched it, next" />
      </>
    );
  }

  const save = (t: VT | undefined) => updateLesson(meta.id, (x) => ({ ...x, videoTests: { ...(x.videoTests ?? {}), ...(t ? { [id]: t } : {}) } }));

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postAI<{ questions: VT["questions"]; fromTranscript: boolean }>("/api/ai/quiz", {
        lessonTitle: meta.title,
        videoTitle: title,
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
    const picked = test.picked.map((p, i) => (i === qi ? ci : p));
    save({ ...test, picked, checked: false });
  };

  const check = () => {
    if (!test) return;
    const passed = test.questions.every((q, i) => test.picked[i] === q.answer);
    save({ ...test, checked: true, passed });
  };

  const right = test ? test.questions.filter((q, i) => test.picked[i] === q.answer).length : 0;

  return (
    <section className="mt-10 border-t border-white/10 pt-8">
      <h3 className="text-2xl font-bold text-ink-100">Video test</h3>
      <p className="mt-1 text-sm text-ink-300">
        Get every question right to complete this video. Wrong answers can be retried.
      </p>
      {youtube && (
        <div className="mt-4">
          <TranscriptBox videoId={youtube} compact />
        </div>
      )}

      {!test && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={busy} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-60">
            {busy ? "Writing your test…" : "I watched it, give me the test"}
          </button>
          {!transcript && <span className="text-xs text-ink-400">Without a transcript the test covers the video&apos;s main ideas.</span>}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {test && (
        <div className="mt-6 space-y-5">
          {!test.fromTranscript && <p className="text-xs text-warn">Written without the transcript, so it covers the video&apos;s main ideas.</p>}
          {test.questions.map((q, qi) => {
            const pickedIdx = test.picked[qi];
            const wrong = test.checked && pickedIdx !== q.answer;
            const ok = test.checked && pickedIdx === q.answer;
            return (
              <div key={qi} className={`rounded-2xl border-2 bg-ink-900 p-5 ${ok ? "border-good" : wrong ? "border-bad/60" : "border-ink-700"}`}>
                <div className="mb-3 flex gap-2 font-semibold text-ink-100">
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
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3 py-2.5 font-serif ${
                          showRight ? "border-good bg-good/10" : sel ? "border-accent bg-accent/10" : "border-ink-700 hover:border-ink-400"
                        }`}
                      >
                        <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${sel ? "border-accent bg-accent" : "border-ink-400"}`} />
                        <RichText text={c} className="text-ink-200" />
                      </div>
                    );
                  })}
                </div>
                {test.checked && (ok || test.passed) && <RichText text={`✓ ${q.explanation}`} className="mt-3 text-sm text-good" />}
                {wrong && <p className="mt-3 text-sm text-bad">Not quite. Rewatch that part or ask the AI, then try again.</p>}
              </div>
            );
          })}
          {test.passed ? (
            <div className="rounded-2xl border-2 border-good bg-good/10 p-5">
              <p className="text-lg font-semibold text-good">All {test.questions.length} right. Video complete!</p>
              <button onClick={goNext} className="mt-3 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900">
                Next →
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={check}
                disabled={test.picked.some((p) => p === null)}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-50"
              >
                Check answers
              </button>
              {test.checked && <span className="text-sm text-ink-300">{right}/{test.questions.length} right</span>}
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
