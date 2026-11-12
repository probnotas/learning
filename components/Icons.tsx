import type { ItemKind } from "@/lib/types";

/** Khan-style square item icon. Filled when done. */
export function ItemIcon({ kind, done, draft }: { kind: ItemKind; done?: boolean; draft?: boolean }) {
  const glyph = { video: "▶", article: "≡", reading: "↗", quiz: "✎", build: "</>" }[kind];
  return (
    <span
      aria-hidden
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 font-mono text-[11px] font-bold ${
        draft
          ? "border-dashed border-ink-600 text-ink-600"
          : done
            ? "border-good bg-good text-ink-900"
            : "border-ink-300 text-ink-200"
      }`}
    >
      {done && !draft ? "✓" : glyph}
    </span>
  );
}

export const KIND_LABEL: Record<ItemKind, string> = {
  video: "Video",
  article: "Article",
  reading: "Reading",
  quiz: "Practice",
  build: "Build",
};
