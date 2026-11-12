"use client";
import { useState } from "react";

export function NotDrafted({ section }: { section: string }) {
  return (
    <div className="not-prose my-4 rounded-md border border-dashed border-ink-700 p-4 font-sans text-sm text-ink-400">
      <strong className="text-ink-300">{section}:</strong> Not yet drafted — generate on demand.
    </div>
  );
}

export function GenerateLessonButton({ lessonId }: { lessonId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      setMsg(data.message ?? `Status ${res.status}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="font-sans">
      <button
        onClick={go}
        disabled={busy}
        className="rounded-md border border-warn/50 px-3 py-1.5 text-sm text-warn hover:bg-warn/10 disabled:opacity-50"
      >
        {busy ? "Asking…" : "Generate full lesson"}
      </button>
      {msg && <p className="mt-2 max-w-sm text-xs text-ink-400">{msg}</p>}
    </div>
  );
}
