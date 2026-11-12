"use client";
import { createContext, useContext } from "react";
import type { CurriculumIndex } from "@/lib/types";

const Ctx = createContext<CurriculumIndex | null>(null);

export function IndexProvider({ value, children }: { value: CurriculumIndex; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIndex(): CurriculumIndex {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIndex outside IndexProvider");
  return v;
}
