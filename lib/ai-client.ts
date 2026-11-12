"use client";
import { useEffect, useState } from "react";

const CODE_KEY = "learnlab:access-code";
let statusPromise: Promise<{ enabled: boolean; needsCode: boolean }> | null = null;

export function useAiStatus(): { enabled: boolean; needsCode: boolean } | null {
  const [s, setS] = useState<{ enabled: boolean; needsCode: boolean } | null>(null);
  useEffect(() => {
    statusPromise ??= fetch("/api/ai/status")
      .then((r) => r.json())
      .catch(() => ({ enabled: false, needsCode: false }));
    statusPromise.then(setS);
  }, []);
  return s;
}

function accessCode(): string {
  try {
    return window.localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

async function call(path: string, body: unknown, retry = true): Promise<Response> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-access-code": accessCode() },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.needsCode) {
      const code = window.prompt("This learnlab deployment needs its access code (LEARNLAB_ACCESS_CODE):");
      if (code) {
        try {
          window.localStorage.setItem(CODE_KEY, code);
        } catch {}
        return call(path, body, false);
      }
    }
  }
  return res;
}

export async function postAI<T>(path: string, body: unknown): Promise<T> {
  const res = await call(path, body);
  const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

/** Streams the chat answer, calling onText with the full text so far. */
export async function streamChat(body: unknown, onText: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await call("/api/ai/chat", body);
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    if (signal?.aborted) {
      await reader.cancel();
      break;
    }
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return text;
}
