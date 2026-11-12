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

const VIDEO_URL = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/g;

/** Split a pasted collection of transcripts (one section per video, each with its YouTube link)
 *  into { videoId: text }. A section counts only if it links exactly one video, so a table of
 *  contents listing every link is skipped. */
export function parseCollection(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const sections = raw.replace(/\r/g, "").split(/\n(?=#{1,4} )/);
  for (const sec of sections) {
    const ids = Array.from(new Set(Array.from(sec.matchAll(VIDEO_URL), (m) => m[1])));
    if (ids.length !== 1) continue;
    const lines = sec.split("\n");
    const at = lines.findIndex((l) => l.includes(ids[0]));
    const body = lines
      .slice(at + 1)
      .filter((l) => !/^\s*(---+|\*\*(Video title|Channel|Link)[:*])/.test(l))
      .join("\n")
      .replace(/\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\*\*/g, "[$1]")
      .replace(/\b\d+ \d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\s*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (wordCount(body) >= 50) out[ids[0]] = (out[ids[0]] ? out[ids[0]] + "\n\n" : "") + body;
  }
  return out;
}

/** Save every transcript found in a pasted collection. Returns the ids saved. */
export function importCollection(raw: string): string[] {
  const found = parseCollection(raw);
  const next = { ...load(), ...found };
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.error("[learnlab] could not save transcripts", err);
    throw err;
  }
  listeners.forEach((l) => l());
  return Object.keys(found);
}

export function useAllTranscripts(): Record<string, string> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => load(),
    () => EMPTY,
  );
}
const EMPTY: Record<string, string> = {};
