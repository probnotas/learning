"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/store";
import { level, totalXP, XP_PER_LEVEL } from "@/lib/xp";
import { useIndex } from "./IndexProvider";

/** "✦ L3" pill. Hover shows total XP. */
export function LevelPill({ light }: { light?: boolean }) {
  const index = useIndex();
  const [state, hydrated] = useAppState();
  const xp = hydrated ? totalXP(index, state) : 0;
  return (
    <span
      title={`${xp} XP · ${XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP to the next level`}
      className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-lg font-semibold ${
        light ? "bg-ink-600 text-white" : "glass text-white"
      }`}
    >
      <span className="text-amber-300 drop-shadow-sm">✦</span> L{level(xp)}
    </span>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState("light");
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "light"), []);
  const toggle = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("learnlab:theme", t);
    } catch {}
    setTheme(t);
  };
  return (
    <button onClick={toggle} title={theme === "dark" ? "Switch to light" : "Switch to dark"} className={className}>
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}

export function BackButton({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      title={label}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 text-2xl text-ink-200 transition hover:bg-ink-700"
    >
      ‹
    </Link>
  );
}

/** Header for the plain pages (notes, projects). */
export function TopBar({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 pt-8">
      <BackButton href="/" label="Back to the campus" />
      <h1 className="flex-1 font-display text-3xl font-bold tracking-[-0.02em] text-ink-100">{title}</h1>
      <ThemeToggle className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 text-lg text-ink-200 hover:bg-ink-700" />
      <LevelPill light />
    </div>
  );
}
