export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-800 ${className}`}>
      <div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}
