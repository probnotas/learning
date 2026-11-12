"use client";
import { useState } from "react";
import { lp } from "@/lib/progress";
import { updateLesson, useAppState } from "@/lib/store";
import { Checkbox } from "../Checkbox";
import { useLesson } from "../LessonContext";

const KIND: Record<string, string> = { concept: "Concept", compute: "Compute", derive: "Derive", estimate: "Estimate" };

export function Problem({
  id,
  title,
  kind = "compute",
  children,
}: {
  id: string;
  title?: string;
  kind?: string;
  children: React.ReactNode;
}) {
  const meta = useLesson();
  const [state] = useAppState();
  const n = meta.problemIds.indexOf(id) + 1;
  const checked = !!lp(state, meta.id).problems[id];
  return (
    <div id={`problem-${id}`} className="my-6 rounded-lg border border-ink-800 bg-ink-900/60 p-4">
      <div className="not-prose mb-2 flex flex-wrap items-center justify-between gap-2 font-sans">
        <h3 className="text-base font-semibold text-ink-100">
          Problem {n}
          {title && <span className="font-normal text-ink-300"> · {title}</span>}
          <span className="ml-2 rounded bg-ink-800 px-1.5 py-0.5 text-[11px] font-normal text-ink-400">
            {KIND[kind] ?? kind}
          </span>
        </h3>
        <Checkbox
          checked={checked}
          onChange={(v) => updateLesson(meta.id, (x) => ({ ...x, problems: { ...x.problems, [id]: v } }))}
          label="I solved this"
        />
      </div>
      <div className="problem-body">{children}</div>
    </div>
  );
}

function Reveal({ label, tone, children }: { label: string; tone: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`not-prose rounded-md border px-2.5 py-1 font-sans text-xs ${tone}`}
        aria-expanded={open}
      >
        {open ? "Hide" : "Show"} {label}
      </button>
      {open && <div className="mt-3 border-l-2 border-ink-700 pl-4">{children}</div>}
    </div>
  );
}

export function Solution({ children }: { children: React.ReactNode }) {
  return (
    <Reveal label="answer / worked solution" tone="border-good/40 text-good hover:bg-good/10">
      {children}
    </Reveal>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Reveal label="hint" tone="border-ink-600 text-ink-300 hover:bg-ink-800">
      {children}
    </Reveal>
  );
}
