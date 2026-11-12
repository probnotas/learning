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

export type ItemKind = "article" | "video" | "reading" | "quiz" | "build" | "milestones" | "paper";

/** One mini-lesson inside a lesson: a short article, a video, a reading, a practice quiz, or a build. */
export interface ItemMeta {
  id: string;
  kind: ItemKind;
  title: string;
  draft: boolean; // not written yet (stub lessons)
  youtube?: string; // video items: YouTube id
  questionIds: string[]; // quiz: question ids; milestones: milestone ids
  sections?: string[]; // paper: section names
}

export interface LessonMeta {
  id: string;
  title: string;
  topic: string; // "A1": the unit this lesson belongs to
  track: string; // "A"
  month: number | null; // 6-month-path month, or null for Year 2
  order: number;
  status: "full" | "stub";
  capstone: boolean; // the end-of-unit portfolio project
  requires: string[]; // extra lesson-level prerequisites
  hours: number | null;
  summary: string;
  items: ItemMeta[];
}

/** A unit = one CURRICULUM.md topic (A1, B1, ...), shown in path order. */
export interface Unit {
  topic: string;
  number: number;
  title: string;
  trackTitle: string;
  lessonIds: string[];
}

export interface CurriculumIndex {
  curriculum: Curriculum;
  lessons: LessonMeta[];
  units: Unit[];
}

export interface BuildFiles {
  starter: string;
  tests: string;
  solution: string;
}
