"use client";
import { createContext, useContext } from "react";
import type { LessonMeta } from "@/lib/types";

const Ctx = createContext<LessonMeta | null>(null);
export const LessonProvider = Ctx.Provider;
export function useLesson(): LessonMeta {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLesson outside LessonProvider");
  return v;
}
