import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Curriculum, MvpMonth, Track } from "./types";

export const CURRICULUM_PATH = path.join(process.cwd(), "CURRICULUM.md");

/** Return the paragraph that starts with e.g. "**Goal:**", without the label. */
function labelledParagraph(md: string, label: string): string {
  const block = md.split(/\n\s*\n/).find((b) => b.trim().startsWith(`**${label}:**`));
  return block ? block.trim().slice(label.length + 5).replace(/\s*\n\s*/g, " ").trim() : "";
}

/** Text between a "## Heading" line and the next "## " heading. */
function section(md: string, headingPrefix: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## ${headingPrefix}`));
  if (start < 0) return "";
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join("\n");
}

function parseTracks(md: string): Track[] {
  const tracks: Track[] = [];
  let track: Track | null = null;
  let inTracks = false;
  for (const line of md.split("\n")) {
    const th = line.match(/^## Track ([A-Z])\s*[—-]+\s*(.+)$/);
    if (th) {
      track = { id: th[1], title: th[2].trim(), topics: [] };
      tracks.push(track);
      inTracks = true;
      continue;
    }
    if (line.startsWith("## ")) {
      inTracks = false;
      track = null;
      continue;
    }
    if (!inTracks || !track) continue;
    const tp = line.match(/^- \*\*([A-Z]\d+)\.\s+(.+?)\*\*(?:\s*[—-]+\s*(.+))?\s*$/);
    if (tp) {
      track.topics.push({
        id: tp[1],
        trackId: track.id,
        title: tp[2].trim(),
        resources: tp[3] ? [tp[3].trim()] : [],
      });
      continue;
    }
    const sub = line.match(/^\s{2,}- (.+)$/);
    const topic = track.topics[track.topics.length - 1];
    if (sub && topic) topic.resources.push(sub[1].trim());
  }
  return tracks;
}

function parseGraph(graphText: string, tracks: Track[]): Record<string, string[]> {
  const allIds = tracks.flatMap((t) => t.topics.map((tp) => tp.id));
  const prereqs: Record<string, Set<string>> = Object.fromEntries(allIds.map((id) => [id, new Set<string>()]));
  const expand = (token: string): string[] => {
    const t = token.trim();
    if (/^[A-Z]\d+$/.test(t)) return allIds.includes(t) ? [t] : [];
    if (/^[A-Z]$/.test(t)) return tracks.find((tr) => tr.id === t)?.topics.map((tp) => tp.id) ?? [];
    return [];
  };
  const add = (from: string, to: string) => {
    if (from !== to && prereqs[to]) prereqs[to].add(from);
  };

  for (const rawLine of graphText.split("\n")) {
    // "(needs X)" annotations attach an extra prerequisite to the topic right before them.
    for (const m of rawLine.matchAll(/([A-Z]\d+)\s*\(needs ([^)]+)\)/g)) {
      for (const src of m[2].split(/[,+]/).flatMap(expand)) add(src, m[1]);
    }
    // Every other parenthetical is commentary ("incl. A3", "recommended, not required").
    const line = rawLine.replace(/\([^)]*\)/g, "");
    if (!line.includes("→")) continue;
    const segments = line.split("→").map((seg) => seg.split("+").flatMap(expand));
    for (let i = 0; i + 1 < segments.length; i++) {
      for (const from of segments[i]) for (const to of segments[i + 1]) add(from, to);
    }
  }
  return Object.fromEntries(Object.entries(prereqs).map(([k, v]) => [k, [...v].sort()]));
}

function parseMvp(sectionText: string): { months: MvpMonth[]; budget: string } {
  const months: MvpMonth[] = [];
  const budgetLines: string[] = [];
  let seenTable = false;
  for (const line of sectionText.split("\n")) {
    const row = line.match(/^\|\s*(\d+)\s*\|(.+?)\|(.*?)\|?\s*$/);
    if (row) {
      seenTable = true;
      const focus = row[2].trim();
      months.push({
        month: Number(row[1]),
        focus,
        scope: row[3].trim(),
        topicIds: [...new Set(focus.match(/[A-Z]\d+/g) ?? [])],
      });
    } else if (!seenTable && line.trim() && !line.startsWith("|")) {
      budgetLines.push(line.trim());
    }
  }
  return { months, budget: budgetLines.join(" ") };
}

export function loadCurriculum(): Curriculum {
  const md = fs.readFileSync(CURRICULUM_PATH, "utf8");
  const tracks = parseTracks(md);
  const graphSection = section(md, "Dependency Graph");
  const graphText = graphSection.match(/```[^\n]*\n([\s\S]*?)```/)?.[1]?.trim() ?? "";
  const mvpSection = section(md, "Minimum Viable Path");
  const { months, budget } = parseMvp(mvpSection);
  const year2 =
    mvpSection
      .split(/\n\s*\n/)
      .find((b) => b.trim().startsWith("Skipped"))
      ?.replace(/\s*\n\s*/g, " ")
      .trim() ?? "";

  return {
    goal: labelledParagraph(md, "Goal"),
    learningStyle: labelledParagraph(md, "Learning style"),
    orderingRule: labelledParagraph(md, "Ordering rule"),
    tracks,
    prereqs: parseGraph(graphText, tracks),
    graphText,
    mvp: months,
    mvpBudget: budget,
    year2,
  };
}
