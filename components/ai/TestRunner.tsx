"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postAI, useAiStatus } from "@/lib/ai-client";
import { lp, testResults, type VideoTest as VT } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { getTranscript, useAllTranscripts } from "@/lib/transcripts";
import { useIndex } from "../IndexProvider";
import { RichText } from "./RichText";
import { TranscriptBox } from "./TranscriptBox";

const BLUE = "bg-[#1865f2] hover:bg-[#1257d6]";

/** Full-page practice, one problem at a time: Check, then Next question or Try again.
 *  Every problem has to be right to pass. */
export function TestRunner({
  lessonId,
  itemId,
  context,
  backHref,
  nextHref,
}: {
  lessonId: string;
  itemId: string;
  context: string;
  backHref: string;
  nextHref: string;
}) {
  const index = useIndex();
  const router = useRouter();
  const status = useAiStatus();
  const [state, hydrated] = useAppState();
  useAllTranscripts(); // re-render when a transcript is added on this page
  const meta = index.lessons.find((l) => l.id === lessonId)!;
  const item = meta.items.find((i) => i.id === itemId)!;
  const isLesson = item.kind === "test";
  const count = isLesson ? 4 : 5;
  const test = lp(state, lessonId).videoTests?.[itemId];
  const results = test ? testResults(test) : [];

  const [cur, setCur] = useState(0);
  const [feedback, setFeedback] = useState<null | "right" | "wrong">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start on the first problem that isn't right yet.
  useEffect(() => {
    if (!test) return;
    const first = testResults(test).findIndex((r) => r !== true);
    setCur(first < 0 ? 0 : first);
    setFeedback(null);
  }, [hydrated, test?.questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const vids = meta.items.filter((i) => i.kind === "video" && i.youtube);
  const withText = vids.filter((v) => getTranscript(v.youtube));
  const transcript = isLesson
    ? withText.map((v) => `## ${v.title}\n${getTranscript(v.youtube)}`).join("\n\n")
    : getTranscript(item.youtube);
  const videoTitle = isLesson ? withText.map((v) => v.title).join("; ") : item.title;

  const save = (t: VT) => updateLesson(lessonId, (x) => ({ ...x, videoTests: { ...(x.videoTests ?? {}), [itemId]: t } }));

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postAI<{ questions: VT["questions"]; fromTranscript: boolean }>("/api/ai/quiz", {
        mode: isLesson ? "lesson" : "video",
        lessonTitle: meta.title,
        videoTitle,
        transcript,
        context,
      });
      save({
        questions: res.questions,
        picked: res.questions.map(() => null),
        results: res.questions.map(() => null),
        checked: false,
        passed: false,
        fromTranscript: res.fromTranscript,
      });
      setCur(0);
      setFeedback(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const q = test?.questions[cur];
  const picked = test?.picked[cur] ?? null;
  const allRight = !!test && results.every((r) => r === true);

  const pick = (ci: number) => {
    if (!test || feedback) return;
    save({ ...test, picked: test.picked.map((p, i) => (i === cur ? ci : p)) });
  };
  const nextOpen = (from: number) => {
    for (let k = 1; k <= results.length; k++) {
      const j = (from + k) % results.length;
      if (results[j] !== true && j !== from) return j;
    }
    return from;
  };
  const check = () => {
    if (!test || !q || picked === null) return;
    const ok = picked === q.answer;
    const res = results.map((r, i) => (i === cur ? (ok || r === true) : r));
    save({ ...test, results: res, checked: true, passed: res.every((r) => r === true) });
    setFeedback(ok ? "right" : "wrong");
  };
  const tryAgain = () => {
    if (!test) return;
    save({ ...test, picked: test.picked.map((p, i) => (i === cur ? null : p)) });
    setFeedback(null);
  };
  const nextQuestion = () => {
    setFeedback(null);
    setCur(nextOpen(cur));
  };
  const skip = () => {
    if (!test) return;
    setFeedback(null);
    setCur(nextOpen(cur));
  };
  const markDone = () => {
    updateLesson(lessonId, (x) => ({ ...x, items: { ...x.items, [itemId]: true } }));
    router.push(nextHref);
  };

  // Enter = the main button.
  const primary: (() => void) | null = !hydrated || status === null
    ? null
    : !status.enabled
      ? markDone
      : !test
        ? busy ? null : generate
        : allRight && feedback !== "wrong"
          ? feedback === "right" ? () => setFeedback(null) : () => router.push(nextHref)
          : feedback === "right"
            ? nextQuestion
            : feedback === "wrong"
              ? tryAgain
              : picked !== null ? check : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && primary && !(e.target as HTMLElement).closest("textarea, input, button, a")) {
        e.preventDefault();
        primary();
      }
      if (test && !feedback && /^[1-4]$/.test(e.key) && !(e.target as HTMLElement).closest("textarea, input")) pick(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const primaryLabel = !status?.enabled
    ? "Mark done"
    : !test
      ? busy ? "Writing…" : "Start"
      : allRight && feedback !== "wrong"
        ? feedback === "right" ? "See results" : "Continue"
        : feedback === "right"
          ? "Next question"
          : feedback === "wrong"
            ? "Try again"
            : "Check";

  const title = isLesson ? `${meta.title}: lesson test` : item.title;
  const done = results.filter((r) => r === true).length;
  const showResults = allRight && !feedback;

  return (
    <div className="flex min-h-screen flex-col bg-ink-900 font-sans text-ink-100">
      <main className={`flex-1 ${feedback ? "pb-60" : "pb-32"}`}>
        <header className="mx-auto max-w-5xl px-6 pt-10 text-center">
          <p className="text-sm font-semibold text-ink-400">{isLesson ? "Lesson test" : "Video test"}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.02em] lg:text-[2.6rem] lg:leading-tight">{title}</h1>
          <div className="mt-4 flex flex-wrap justify-center gap-8 text-[15px] font-semibold text-[#1865f2]">
            <Link href={backHref} className="hover:underline">
              ‹ Back to the lesson
            </Link>
            {!isLesson && item.youtube && (
              <a href={`https://www.youtube.com/watch?v=${item.youtube}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Open the video ↗
              </a>
            )}
          </div>
        </header>
        <div className="mx-auto mt-8 max-w-5xl border-t border-ink-700" />

        <div className="mx-auto max-w-3xl px-6 pt-10">
          {!hydrated || status === null ? null : !status.enabled ? (
            <div>
              <p className="text-lg font-bold">This test needs the AI key.</p>
              <p className="mt-1 text-ink-300">Set GROQ_API_KEY (see the README). Until then you can mark this step done.</p>
            </div>
          ) : !test ? (
            <div>
              <p className="text-lg font-bold">{count} problems.</p>
              <p className="mt-1 italic text-ink-300">
                {isLesson
                  ? "Two concepts, one calculation, one real-world application, on the whole lesson. Get all four right to pass the lesson."
                  : "On what this video covers. Get every one right to complete the video."}
              </p>
              {!isLesson && item.youtube && (
                <div className="mt-6">
                  <TranscriptBox videoId={item.youtube} compact />
                </div>
              )}
              {isLesson && vids.length > 0 && (
                <p className="mt-4 text-sm text-ink-400">
                  {withText.length} of {vids.length} video transcripts added.{" "}
                  <Link href="/transcripts" className="underline hover:text-ink-200">
                    Add transcripts
                  </Link>
                </p>
              )}
              {busy && <p className="mt-6 text-ink-300">Writing your problems…</p>}
            </div>
          ) : showResults ? (
            <div className="text-center">
              <p className="text-2xl font-bold text-good">All {test.questions.length} right.</p>
              <p className="mt-1 text-ink-300">{isLesson ? "Lesson test passed." : "Video complete."}</p>
              <button onClick={generate} disabled={busy} className="mt-6 text-sm font-semibold text-[#1865f2] hover:underline disabled:opacity-50">
                {busy ? "Writing…" : "Practice with new problems"}
              </button>
            </div>
          ) : q ? (
            <div>
              {!isLesson && !test.fromTranscript && cur === 0 && (
                <p className="mb-4 text-xs text-warn">Written without the transcript, so it covers the video&apos;s main ideas.</p>
              )}
              <p className="text-sm font-semibold text-ink-400">
                Problem {cur + 1} of {test.questions.length}
              </p>
              <RichText text={q.question} className="mt-2 text-[19px] font-bold leading-snug" />
              <div className="mt-6 space-y-3">
                {q.choices.map((c, ci) => {
                  const sel = picked === ci;
                  const state = feedback && sel ? (feedback === "right" ? "right" : "wrong") : sel ? "sel" : "idle";
                  return (
                    <button
                      key={ci}
                      onClick={() => pick(ci)}
                      disabled={!!feedback}
                      className={`flex w-full items-start gap-4 rounded-lg border-2 px-4 py-3.5 text-left text-[16px] transition ${
                        state === "right"
                          ? "border-good bg-good/10"
                          : state === "wrong"
                            ? "border-bad bg-bad/10"
                            : state === "sel"
                              ? "border-[#1865f2] bg-[#1865f2]/5"
                              : "border-ink-700 hover:border-ink-400"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                          sel ? "border-[#1865f2] bg-[#1865f2] text-white" : "border-ink-600 text-ink-400"
                        }`}
                      >
                        {String.fromCharCode(65 + ci)}
                      </span>
                      <RichText text={c} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {error && <p className="mt-4 text-sm text-bad">{error}</p>}

          {/* related content, like Khan's */}
          <div className="mt-14 border-t border-ink-700 pt-8">
            <p className="font-semibold text-ink-400">Related content</p>
            <div className="mt-4 space-y-4">
              {(isLesson ? vids : [item]).map((v) => (
                <Link key={v.id} href={`/lesson/${meta.id}/${v.id}`} className="flex items-center gap-5 hover:underline">
                  <span className="flex h-[70px] w-[124px] shrink-0 items-center justify-center rounded-md bg-ink-800 text-xl text-ink-400">▶</span>
                  <span className="text-[17px] font-semibold">{v.title}</span>
                </Link>
              ))}
              {isLesson && !vids.length && (
                <Link href={`/lesson/${meta.id}`} className="font-semibold hover:underline">
                  {meta.title}
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* feedback strip */}
      {feedback && q && (
        <div className={`fixed inset-x-0 bottom-[80px] border-t py-4 ${feedback === "right" ? "border-good/40 bg-good/10" : "border-bad/40 bg-bad/10"}`}>
          <div className="mx-auto max-w-3xl px-6">
            {feedback === "right" ? (
              <>
                <p className="font-bold text-good">Nice, that&apos;s right.</p>
                <RichText text={q.explanation} className="mt-1 text-sm text-ink-200" />
              </>
            ) : (
              <>
                <p className="font-bold text-bad">Not quite yet.</p>
                <p className="mt-1 text-sm text-ink-200">
                  {isLesson ? "Look back through the lesson" : "Rewatch that part or ask the AI"}, then try again. You can also skip and come back.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* bottom bar */}
      <div className="fixed inset-x-0 bottom-0 h-[80px] border-t border-ink-700 bg-ink-900">
        <div className="flex h-full items-center gap-4 px-5 lg:px-8">
          <Link
            href={backHref}
            title="Back to the lesson"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1865f2] text-lg font-bold text-[#1865f2] hover:bg-[#1865f2]/10"
          >
            ‹
          </Link>
          <div className="flex flex-1 items-center justify-center gap-4">
            <span className="hidden text-[17px] font-semibold sm:inline">
              {test ? `${done} of ${test.questions.length} problems` : `${count} problems`}
            </span>
            <div className="flex items-center gap-2">
              {(test ? results : Array<null>(count).fill(null)).map((r, i) => (
                <button
                  key={i}
                  disabled={!test || !!feedback}
                  onClick={() => setCur(i)}
                  title={`Problem ${i + 1}`}
                  className={`flex items-center justify-center rounded-full border-2 text-[9px] font-bold text-white transition ${
                    test && i === cur && !showResults ? "h-5 w-5" : "h-4 w-4"
                  } ${r === true ? "border-good bg-good" : r === false ? "border-bad" : test && i === cur ? "border-[#1865f2]" : "border-ink-600"}`}
                >
                  {r === true ? "✓" : ""}
                </button>
              ))}
            </div>
          </div>
          {test && !allRight && !feedback && results.filter((r) => r !== true).length > 1 && (
            <button onClick={skip} className="px-2 text-[17px] font-semibold text-[#1865f2] hover:underline">
              Skip
            </button>
          )}
          {test && !allRight && (
            <button onClick={generate} disabled={busy} className="hidden px-2 text-sm text-ink-400 hover:underline md:inline">
              {busy ? "Writing…" : "New problems"}
            </button>
          )}
          <button
            onClick={() => primary?.()}
            disabled={!primary}
            className={`h-12 min-w-[150px] rounded-md px-6 text-[17px] font-semibold text-white disabled:opacity-40 ${BLUE}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
