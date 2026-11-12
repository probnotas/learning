"use client";
// Capstone project items: a milestone checklist and a paper you write in the app.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { postAI, useAiStatus } from "@/lib/ai-client";
import { lp, PAPER_MIN_WORDS, paperReady, type PaperDraft } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { RichText } from "../ai/RichText";
import { useItemCtx } from "../ItemContext";

const MilestoneCtx = createContext<string | null>(null);

export function Milestones({ id, children }: { id: string; title: string; children: React.ReactNode }) {
  const { meta, activeItem, goNext } = useItemCtx();
  const [state] = useAppState();
  if (activeItem !== id) return null;
  const item = meta.items.find((i) => i.id === id)!;
  const p = lp(state, meta.id);
  const done = item.questionIds.filter((m) => p.items[`${id}:${m}`]).length;
  return (
    <MilestoneCtx.Provider value={id}>
      <div className="mb-5 flex items-center justify-between rounded-xl border border-ink-700 bg-ink-900 p-4">
        <p className="text-sm text-ink-300">Tick each milestone when it&apos;s actually done in your repo.</p>
        <span className="font-semibold text-ink-100">
          {done}/{item.questionIds.length}
        </span>
      </div>
      <ol className="space-y-3">{children}</ol>
      {done === item.questionIds.length && (
        <div className="mt-6 rounded-2xl border-2 border-good bg-good/10 p-5">
          <p className="text-lg font-semibold text-good">All milestones done. Time to write it up.</p>
          <button onClick={goNext} className="mt-3 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900">
            Next →
          </button>
        </div>
      )}
    </MilestoneCtx.Provider>
  );
}

export function Milestone({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  const itemId = useContext(MilestoneCtx)!;
  const { meta } = useItemCtx();
  const [state] = useAppState();
  const key = `${itemId}:${id}`;
  const checked = !!lp(state, meta.id).items[key];
  return (
    <li className={`rounded-2xl border-2 bg-ink-900 p-4 ${checked ? "border-good/60" : "border-ink-700"}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => updateLesson(meta.id, (x) => ({ ...x, items: { ...x.items, [key]: e.target.checked } }))}
          className="mt-1.5 h-5 w-5 shrink-0 accent-[#bef264]"
        />
        <span className="min-w-0">
          <span className={`block font-semibold ${checked ? "text-good" : "text-ink-100"}`}>{title}</span>
          {children && <span className="lesson-prose prose tight mt-1 block max-w-none text-[15px]">{children}</span>}
        </span>
      </label>
    </li>
  );
}

const words = (t: string | undefined) => (t ?? "").split(/\s+/).filter(Boolean).length;

/** The write-up: one editor per section, a repo link, an AI review against the rubric, export, submit. */
export function Paper({ id, title, children }: { id: string; title: string; sections: string; children?: React.ReactNode }) {
  const { meta, activeItem, context, goNext } = useItemCtx();
  const [state, hydrated] = useAppState();
  const status = useAiStatus();
  const item = meta.items.find((i) => i.id === id)!;
  const saved = lp(state, meta.id).paper;
  const [draft, setDraft] = useState<PaperDraft>({ sections: {}, repo: "", submitted: false });
  const [review, setReview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const rubricRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hydrated && saved) setDraft(saved);
  }, [hydrated, meta.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (activeItem !== id) return null;
  const sections = item.sections ?? [];
  const ready = paperReady(item, draft);

  const change = (next: PaperDraft) => {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => updateLesson(meta.id, (x) => ({ ...x, paper: next })), 600);
  };
  const markdown = () =>
    [`# ${meta.title.replace(/^Capstone:\s*/, "")}`, "", `Code: ${draft.repo || "(add your repo link)"}`, "", ...sections.flatMap((s) => [`## ${s}`, "", draft.sections[s] ?? "", ""])].join("\n");

  const runReview = async () => {
    setBusy(true);
    setReview(null);
    try {
      const res = await postAI<{ review: string }>("/api/ai/review", {
        lessonTitle: meta.title,
        context,
        rubric: rubricRef.current?.innerText ?? "",
        paper: markdown(),
      });
      setReview(res.review);
    } catch (e) {
      setReview(`⚠ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {children && (
        <div ref={rubricRef} className="lesson-prose prose mb-6 max-w-none rounded-2xl border border-ink-700 bg-ink-900 p-5">
          {children}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-ink-100">Public repo link</span>
        <span className="ml-2 text-xs text-ink-400">(GitHub: code, notebook, figures, README)</span>
        <input
          value={draft.repo}
          onChange={(e) => change({ ...draft, repo: e.target.value, submitted: false })}
          placeholder="https://github.com/you/project"
          className="mt-1 w-full rounded-xl border-2 border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-ink-100 focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mt-6 space-y-5">
        {sections.map((sec) => {
          const n = words(draft.sections[sec]);
          return (
            <label key={sec} className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-ink-100">{sec}</span>
                <span className={`text-xs ${n >= PAPER_MIN_WORDS ? "text-good" : "text-ink-400"}`}>
                  {n} words{n < PAPER_MIN_WORDS ? ` (min ${PAPER_MIN_WORDS})` : " ✓"}
                </span>
              </span>
              <textarea
                value={draft.sections[sec] ?? ""}
                onChange={(e) => change({ ...draft, sections: { ...draft.sections, [sec]: e.target.value }, submitted: false })}
                rows={sec.toLowerCase().startsWith("abstract") ? 5 : 9}
                className="mt-1 w-full rounded-xl border-2 border-ink-700 bg-ink-950 p-3 font-serif text-[15px] leading-relaxed text-ink-100 focus:border-accent focus:outline-none"
              />
            </label>
          );
        })}
      </div>

      {review && (
        <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-850 p-5 text-sm text-ink-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-400">Reviewer feedback</span>
            <button onClick={() => setReview(null)} className="text-xs text-ink-400 hover:text-ink-200">
              ✕
            </button>
          </div>
          <RichText text={review} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={runReview}
          disabled={!status?.enabled || busy}
          title={status?.enabled ? "Get reviewer-style feedback against the rubric" : "Set GROQ_API_KEY to enable"}
          className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-ink-100 hover:bg-white/20 disabled:opacity-40"
        >
          {busy ? "Reviewing…" : "✦ Review against the rubric"}
        </button>
        <button
          onClick={() => {
            const url = URL.createObjectURL(new Blob([markdown()], { type: "text/markdown" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `${meta.id.replace(/-capstone$/, "")}-paper.md`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-ink-100 hover:bg-white/20"
        >
          ⬇ Download .md
        </button>
        {draft.submitted && ready ? (
          <span className="ml-auto text-sm font-semibold text-good">✓ In your portfolio</span>
        ) : (
          <button
            disabled={!ready}
            onClick={() => {
              const next = { ...draft, submitted: true };
              setDraft(next);
              updateLesson(meta.id, (x) => ({ ...x, paper: next }));
            }}
            title={ready ? "" : `Every section needs ${PAPER_MIN_WORDS}+ words, plus a repo link`}
            className="ml-auto rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-40"
          >
            Submit to portfolio
          </button>
        )}
      </div>
      {draft.submitted && ready && (
        <div className="mt-6 rounded-2xl border-2 border-good bg-good/10 p-5">
          <p className="text-lg font-semibold text-good">{title} submitted. Unit project complete!</p>
          <button onClick={goNext} className="mt-3 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-900">
            Back to the campus →
          </button>
        </div>
      )}
    </div>
  );
}
