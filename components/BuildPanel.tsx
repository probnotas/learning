"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { lp } from "@/lib/progress";
import { runInWorker, type RunResult } from "@/lib/runner";
import { updateLesson, useAppState } from "@/lib/store";
import type { BuildFiles } from "@/lib/types";
import { Plot } from "./Plot";

// Monaco is served from /public/monaco (copied at install time) — never from a CDN.
const Editor = dynamic(
  async () => {
    const mod = await import("@monaco-editor/react");
    // Absolute URL: Monaco's web workers can't resolve a relative path.
    mod.loader.config({ paths: { vs: `${window.location.origin}/monaco/vs` } });
    return mod.default;
  },
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-md bg-ink-900" /> },
);

export function BuildPanel({ lessonId, files }: { lessonId: string; files: BuildFiles | null }) {
  const [state, hydrated] = useAppState();
  const p = lp(state, lessonId);
  const [code, setCode] = useState<string>(files?.starter ?? "");
  // Restore saved code once localStorage is available.
  useEffect(() => {
    if (hydrated && p.code !== undefined) setCode(p.code);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  if (!files) {
    return <p className="text-bad">Build files missing for this lesson (content/builds/{lessonId}/).</p>;
  }

  const onChange = (v: string | undefined) => {
    const next = v ?? "";
    setCode(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateLesson(lessonId, (x) => ({ ...x, code: next })), 600);
  };

  const run = async () => {
    setRunning(true);
    const r = await runInWorker(code, files.tests);
    setResult(r);
    setRunning(false);
    const allPass = !r.error && r.results.length > 0 && r.results.every((t) => t.pass);
    updateLesson(lessonId, (x) => ({ ...x, code, buildPassed: x.buildPassed || allPass }));
  };

  const reset = () => {
    if (!confirm("Replace your code with the starter? Your current code will be lost.")) return;
    onChange(files.starter);
  };

  const passed = result ? result.results.filter((t) => t.pass).length : 0;

  return (
    <div className="not-prose my-6 font-sans">
      <div className="overflow-hidden rounded-md border border-ink-700">
        <div className="flex items-center justify-between border-b border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-400">
          <span>build.js · JavaScript · runs in a sandboxed Web Worker</span>
          <span>{p.buildPassed ? <span className="text-good">passed ✓</span> : "Ctrl/⌘+Enter to run"}</span>
        </div>
        <Editor
          height="420px"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={onChange}
          onMount={(editor, monaco) => {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => document.getElementById(`run-${lessonId}`)?.click());
          }}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          id={`run-${lessonId}`}
          onClick={run}
          disabled={running}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-ink-900 hover:brightness-110 disabled:opacity-60"
        >
          {running ? "Running…" : "▶ Run"}
        </button>
        <button onClick={reset} className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:border-ink-400">
          Reset to starter
        </button>
        <button
          onClick={() => {
            if (showSolution || confirm("Try it yourself first? The build only counts if you make the tests pass.")) setShowSolution((s) => !s);
          }}
          className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:border-ink-400"
        >
          {showSolution ? "Hide reference solution" : "Reveal reference solution"}
        </button>
        {result && (
          <span className="text-xs text-ink-400">
            {result.results.length > 0 && `${passed}/${result.results.length} tests passed · `}
            {result.ms} ms
          </span>
        )}
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          {result.error && (
            <pre className="whitespace-pre-wrap rounded-md border border-bad/40 bg-bad/5 p-3 font-mono text-xs text-bad">{result.error}</pre>
          )}
          {result.results.length > 0 && (
            <ul className="space-y-1 rounded-md border border-ink-800 bg-ink-900 p-3 font-mono text-xs">
              {result.results.map((t, i) => (
                <li key={i} className={t.pass ? "text-good" : "text-bad"}>
                  {t.pass ? "✓" : "✗"} {t.name}
                  {!t.pass && t.message && <span className="block pl-4 text-ink-300">{t.message}</span>}
                </li>
              ))}
            </ul>
          )}
          {result.plots.map((pl, i) => (
            <Plot key={i} data={pl} />
          ))}
          {result.logs.length > 0 && (
            <pre className="max-h-64 overflow-auto rounded-md border border-ink-800 bg-ink-950 p-3 font-mono text-xs text-ink-200">
              {result.logs.join("\n")}
            </pre>
          )}
        </div>
      )}

      {showSolution && (
        <div className="mt-4">
          <p className="mb-1 text-xs uppercase tracking-widest text-ink-400">Reference solution</p>
          <pre className="max-h-[480px] overflow-auto rounded-md border border-ink-800 bg-ink-950 p-3 font-mono text-xs text-ink-200">
            {files.solution}
          </pre>
        </div>
      )}
    </div>
  );
}
