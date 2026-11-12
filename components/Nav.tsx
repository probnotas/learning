"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { streak, todayKey } from "@/lib/progress";
import { useAppState } from "@/lib/store";

export function Nav() {
  const [state, hydrated] = useAppState();
  const [theme, setTheme] = useState<string>("dark");
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "dark"), []);
  const toggle = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("learnlab:theme", t);
    } catch {}
    setTheme(t);
  };
  const days = streak(state.activityDays);
  return (
    <header className="sticky top-0 z-30 h-14 bg-nav text-white shadow">
      <nav className="mx-auto grid h-full max-w-7xl grid-cols-3 items-center px-4 text-sm">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-semibold hover:underline">
            Course
          </Link>
          <Link href="/notes" className="opacity-80 hover:underline hover:opacity-100">
            Notes
          </Link>
          <Link href="/projects" className="opacity-80 hover:underline hover:opacity-100">
            Projects
          </Link>
        </div>
        <Link href="/" className="justify-self-center text-xl font-bold tracking-tight">
          learn<span className="text-[#7cc4ff]">lab</span>
        </Link>
        <div className="flex items-center justify-end gap-4">
          {hydrated && (
            <span title={state.activityDays.includes(todayKey()) ? "You've worked today" : "Do something today to keep your streak"} className="opacity-90">
              🔥 {days} day{days === 1 ? "" : "s"}
            </span>
          )}
          <button onClick={toggle} className="rounded border border-white/30 px-2 py-1 text-xs hover:bg-white/10" title="Toggle light / dark">
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
      </nav>
    </header>
  );
}
