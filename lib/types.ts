// Shared types. Safe to import from both server and client code.

export interface Topic {
  id: string; // e.g. "A1"
  trackId: string; // e.g. "A"
  title: string;
  resources: string[]; // raw markdown lines from CURRICULUM.md
}

export interface Track {
  id: string;
  title: string;
  topics: Topic[];
}

export interface MvpMonth {
  month: number;
  focus: string;
  scope: string;
  topicIds: string[];
}

export interface Curriculum {
  goal: string;
  learningStyle: string;
  orderingRule: string;
  tracks: Track[];
  /** Direct topic-level prerequisites, parsed from the Dependency Graph block. */
  prereqs: Record<string, string[]>;
  graphText: string;
  mvp: MvpMonth[];
  mvpBudget: string;
  year2: string;
}

export interface WatchItem {
  id: string;
  title: string;
  kind: "watch" | "read";
}

export interface LessonMeta {
  id: string;
  title: string;
  topic: string; // "A1"
  track: string; // "A"
  month: number | null; // MVP month, or null for Year 2
  order: number;
  status: "full" | "stub";
  requires: string[]; // extra lesson-level prerequisites
  hours: number | null;
  summary: string;
  watchItems: WatchItem[];
  problemIds: string[];
  hasBuild: boolean;
}

export interface CurriculumIndex {
  curriculum: Curriculum;
  lessons: LessonMeta[];
}

export interface BuildFiles {
  starter: string;
  tests: string;
  solution: string;
}
