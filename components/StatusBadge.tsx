import { STATE_LABEL, type LessonState } from "@/lib/progress";

const STYLE: Record<LessonState, string> = {
  not_started: "border-ink-700 text-ink-400",
  watching: "border-accent-dim text-accent",
  problems_done: "border-warn/40 text-warn",
  build_done: "border-warn/60 text-warn",
  complete: "border-good/50 text-good",
};

export function StatusBadge({ state, locked }: { state: LessonState; locked?: boolean }) {
  if (locked && state === "not_started")
    return <span className="rounded border border-ink-700 px-1.5 py-0.5 font-sans text-xs text-ink-400">🔒 Locked</span>;
  return (
    <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 font-sans text-xs ${STYLE[state]}`}>
      {state === "complete" ? "✓ " : ""}
      {STATE_LABEL[state]}
    </span>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-800 ${className}`}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}
