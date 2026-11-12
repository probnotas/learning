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

const STAMP_LINE = /^\s*(?:\*\*)?\[\d{1,2}:\d{2}(?::\d{2})?\](?:\*\*)?/;
const META_LINE = /^\s*(?:#{1,6}\s|-{3,}\s*$|\*{0,2}(?:Video title|Channel|Link|Duration|Published|Caption source|Words)\b)/i;

/** Split a pasted collection of transcripts into { videoId: text }. Works on the raw Markdown
 *  or on text copied from a rendered page (no #, no **): each transcript starts at a line with
 *  its YouTube link and runs to the next link line. A link followed by little text (a table of
 *  contents entry) is skipped. When the text has [mm:ss] paragraphs, the next video's title and
 *  details that sit before its link are trimmed off the end. */
export function parseCollection(raw: string): Record<string, string> {
  const lines = raw.replace(/\r/g, "").split("\n");
  const starts: { line: number; id: string }[] = [];
  lines.forEach((l, i) => {
    const ids = Array.from(new Set(Array.from(l.matchAll(VIDEO_URL), (m) => m[1])));
    if (ids.length === 1) starts.push({ line: i, id: ids[0] });
  });
  const out: Record<string, string> = {};
  starts.forEach((st, k) => {
    let body = lines.slice(st.line + 1, k + 1 < starts.length ? starts[k + 1].line : lines.length);
    const lastStamp = body.map((l) => STAMP_LINE.test(l)).lastIndexOf(true);
    if (lastStamp >= 0) {
      body = body.slice(0, lastStamp + 1);
    } else {
      while (body.length && (META_LINE.test(body[body.length - 1]) || !body[body.length - 1].trim() || wordCount(body[body.length - 1]) < 12)) body.pop();
    }
    const text = body
      .filter((l) => !META_LINE.test(l))
      .join("\n")
      .replace(/\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\*\*/g, "[$1]")
      .replace(/\b\d+ \d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\s*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (wordCount(text) >= 50 && wordCount(text) > wordCount(out[st.id] ?? "")) out[st.id] = text;
  });
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
