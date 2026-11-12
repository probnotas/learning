"use client";

export interface PlotSeries { name: string; x: number[]; y: number[]; points: boolean }
export interface PlotData { series: PlotSeries[]; opts: { title?: string; xlabel?: string; ylabel?: string } }
export interface TestResult { name: string; pass: boolean; message?: string }
export interface RunResult { logs: string[]; plots: PlotData[]; results: TestResult[]; error: string | null; ms: number }

/** Run code + tests in a fresh Web Worker; kill it after `timeoutMs`. */
export function runInWorker(code: string, tests: string, timeoutMs = 8000): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const worker = new Worker("/harness-worker.js");
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        logs: [],
        plots: [],
        results: [],
        error: `Timed out after ${timeoutMs / 1000}s — infinite loop, or a simulation with too many steps?`,
        ms: timeoutMs,
      });
    }, timeoutMs);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ...e.data, ms: Math.round(performance.now() - started) });
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ logs: [], plots: [], results: [], error: e.message || "Worker error", ms: 0 });
    };
    worker.postMessage({ code, tests });
  });
}
