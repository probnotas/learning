"use client";
// Practice sets: auto-checked questions. You pass only when every question is right.
import { createContext, useContext, useEffect, useState } from "react";
import { closeEnough, lp, parseNumber, quizScore } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { useItemCtx } from "../ItemContext";
import { GenerateLessonButton } from "./Draft";

interface QState {
  picked: string | null;
  pick: (v: string) => void;
  correctChoice: string | undefined;
  solved: boolean;
  revealed: boolean;
}
const QCtx = createContext<QState | null>(null);

export function Quiz({ id, draft, children }: { id: string; title: string; draft?: boolean; children?: React.ReactNode }) {
  const { meta, activeItem, goNext } = useItemCtx();
  const [state] = useAppState();
  if (activeItem !== id) return null;
  if (draft) {
    return (
      <div className="rounded-lg border-2 border-dashed border-ink-700 p-6">
        <p className="font-semibold text-ink-100">This practice set isn&apos;t written yet</p>
        <p className="mt-1 font-serif text-ink-400">The lesson can&apos;t be passed until it exists.</p>
        <div className="mt-4">
          <GenerateLessonButton lessonId={meta.id} />
        </div>
      </div>
    );
  }
  const item = meta.items.find((i) => i.id === id)!;
  const p = lp(state, meta.id);
  const { right, total } = quizScore(item, p);
  return (
    <div>
      <div className="mb-6 rounded-2xl border border-white/10 bg-ink-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-300">
            Get <strong className="text-ink-100">all {total}</strong> right to pass. Wrong answers can be retried as many times as you need.
          </p>
          <span className="text-sm font-semibold text-ink-100">
            {right}/{total} correct
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {item.questionIds.map((q, i) => (
            <a
              key={q}
              href={`#q-${q}`}
              title={`Question ${i + 1}`}
              className={`h-2.5 flex-1 rounded-full ${
                p.answers[q]?.correct ? "bg-good" : p.answers[q] ? "bg-bad/70" : "bg-ink-700"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
      {right === total ? (
        <div className="mt-8 rounded-lg border-2 border-good bg-good/10 p-5">
          <p className="text-lg font-semibold text-good">Every question right. Practice passed!</p>
          <button onClick={goNext} className="mt-3 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900">
            Next →
          </button>
        </div>
      ) : (
        <p className="mt-8 text-sm text-ink-400">
          {total - right} question{total - right === 1 ? "" : "s"} left. Fix the red ones and check again.
        </p>
      )}
    </div>
  );
}

export function Q({
  id,
  title,
  answer,
  labels,
  tol,
  choice,
  children,
}: {
  id: string;
  title?: string;
  answer?: string; // numeric answers separated by ";"
  labels?: string; // input labels separated by ";"
  tol?: string; // relative tolerance(s), default 1%
  choice?: string; // correct <Choice v="..."> for multiple choice
  children: React.ReactNode;
}) {
  const { meta } = useItemCtx();
  const [state, hydrated] = useAppState();
  const saved = lp(state, meta.id).answers[id];
  const expected = answer ? answer.split(";").map((s) => parseNumber(s)) : [];
  const labelList = labels ? labels.split(";").map((s) => s.trim()) : [];
  const tols = (tol ?? "0.01").split(";").map(Number);
  const [values, setValues] = useState<string[]>(expected.map(() => ""));
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !saved) return;
    if (choice) setPicked(saved.values[0] ?? null);
    else setValues(expected.map((_, i) => saved.values[i] ?? ""));
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const solved = !!saved?.correct;
  const n = (meta.items.find((it) => it.questionIds.includes(id))?.questionIds.indexOf(id) ?? 0) + 1;

  const check = () => {
    let correct: boolean;
    let vals: string[];
    if (choice) {
      if (!picked) return setFeedback("Pick an answer first.");
      correct = picked === choice;
      vals = [picked];
    } else {
      if (values.some((v) => !v.trim())) return setFeedback("Fill in every box first.");
      const parsed = values.map(parseNumber);
      if (parsed.some((v) => !isFinite(v))) return setFeedback("Couldn't read one of your numbers. Use digits, fractions like 7/6, or pi.");
      correct = parsed.every((v, i) => closeEnough(v, expected[i], tols[i] ?? tols[0]));
      vals = values;
    }
    updateLesson(meta.id, (x) => ({
      ...x,
      answers: { ...x.answers, [id]: { values: vals, correct, attempts: (x.answers[id]?.attempts ?? 0) + 1 } },
    }));
    setFeedback(correct ? null : "Not quite. Try again.");
  };

  const tried = (saved?.attempts ?? 0) > 0;
  const border = solved ? "border-good" : tried ? "border-bad/70" : "border-white/10";

  return (
    <QCtx.Provider value={{ picked, pick: (v) => !solved && setPicked(v), correctChoice: choice, solved, revealed }}>
      <section id={`q-${id}`} className={`scroll-mt-20 rounded-2xl border ${border} bg-ink-900 p-6`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-ink-100">
            Question {n}
            {title && <span className="font-normal text-ink-400"> · {title}</span>}
          </h3>
          {solved && <span className="text-sm font-semibold text-good">✓ Correct</span>}
        </div>
        {/* Flex + order: question and choices first, then inputs and buttons, then the solution. */}
        <div className="lesson-prose prose tight flex max-w-none flex-col">
          {children}

        {!choice && (
          <div className="not-prose order-1 mt-4 flex flex-wrap gap-3 font-sans">
            {expected.map((_, i) => (
              <label key={i} className="flex flex-col gap-1 text-xs text-ink-400">
                {labelList[i] ?? (expected.length > 1 ? `Answer ${i + 1}` : "Your answer")}
                <input
                  value={values[i] ?? ""}
                  disabled={solved}
                  onChange={(e) => setValues((vs) => vs.map((v, j) => (j === i ? e.target.value : v)))}
                  onKeyDown={(e) => e.key === "Enter" && check()}
                  inputMode="decimal"
                  className={`w-40 rounded-xl border bg-ink-950 px-3 py-2.5 font-mono text-base text-ink-100 focus:border-white/60 focus:outline-none ${
                    solved ? "border-good" : "border-white/15"
                  }`}
                />
              </label>
            ))}
          </div>
        )}

        <div className="not-prose order-2 mt-4 flex flex-wrap items-center gap-3 font-sans">
          {!solved && (
            <button onClick={check} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-ink-900 hover:brightness-95">
              Check
            </button>
          )}
          {feedback && <span className={`text-sm ${feedback.startsWith("Not") ? "text-bad" : "text-warn"}`}>{feedback}</span>}
          {(tried || solved) && (
            <button onClick={() => setRevealed((r) => !r)} className="text-sm text-ink-400 underline hover:text-ink-200">
              {revealed ? "Hide solution" : solved ? "See worked solution" : "Stuck? Show worked solution"}
            </button>
          )}
        </div>
        </div>
      </section>
    </QCtx.Provider>
  );
}

export function Choice({ v, children }: { v: string; children: React.ReactNode }) {
  const q = useContext(QCtx)!;
  const selected = q.picked === v;
  const right = q.solved && v === q.correctChoice;
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => q.pick(v)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), q.pick(v))}
      className={`not-prose my-2 flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors ${
        right ? "border-good bg-good/10" : selected ? "border-white/60 bg-white/10" : "border-white/10 hover:border-white/30"
      }`}
    >
      <span
        className={`mt-1 inline-block h-4 w-4 shrink-0 rounded-full border-2 ${
          right ? "border-good bg-good" : selected ? "border-white bg-white" : "border-white/40"
        }`}
      />
      <span className="tight text-ink-200 [&>p]:my-0">{children}</span>
    </div>
  );
}

export function Solution({ children }: { children: React.ReactNode }) {
  const q = useContext(QCtx);
  if (!q?.revealed) return null;
  return (
    <div className="order-3 mt-4 rounded-md border-l-4 border-good bg-good/5 px-4 py-3">
      <p className="not-prose mb-1 text-xs font-semibold uppercase tracking-widest text-good">Worked solution</p>
      {children}
    </div>
  );
}
