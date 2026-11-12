"use client";
// Video transcripts you paste in. Stored only in this browser (never committed or uploaded
// anywhere except to your own AI route when you use an AI feature).
import { useSyncExternalStore } from "react";

const KEY = "learnlab:transcripts";
let cache: Record<string, string> | null = null;
const listeners = new Set<() => void>();

function load(): Record<string, string> {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    cache = {};
  }
  return cache!;
}

export function getTranscript(videoId: string | undefined): string {
  if (!videoId || typeof window === "undefined") return "";
  return load()[videoId] ?? "";
}

export function setTranscript(videoId: string, text: string) {
  const next = { ...load() };
  if (text.trim()) next[videoId] = cleanTranscript(text);
  else delete next[videoId];
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.error("[learnlab] could not save transcript", err);
  }
  listeners.forEach((l) => l());
}

/** YouTube's "Show transcript" copy has a timestamp line before every caption; keep them inline. */
export function cleanTranscript(raw: string): string {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(lines[i]) && lines[i + 1]) {
      out.push(`[${lines[i]}] ${lines[i + 1]}`);
      i++;
    } else out.push(lines[i]);
  }
  return out.join("\n");
}

export function useTranscript(videoId: string | undefined): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getTranscript(videoId),
    () => "",
  );
}

export function wordCount(s: string) {
  return s ? s.split(/\s+/).filter(Boolean).length : 0;
}
