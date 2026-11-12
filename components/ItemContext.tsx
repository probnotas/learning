"use client";
import { createContext, useContext } from "react";
import type { LessonMeta } from "@/lib/types";

export interface ItemCtx {
  meta: LessonMeta;
  activeItem: string;
  context: string; // lesson text (articles + video/reading notes) for AI features
  goNext: () => void; // navigate to the next item (or back to the unit when done)
}

const Ctx = createContext<ItemCtx | null>(null);
export const ItemProvider = Ctx.Provider;
export function useItemCtx(): ItemCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useItemCtx outside ItemProvider");
  return v;
}
