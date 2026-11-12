"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIndex } from "./IndexProvider";

export function Nav() {
  const index = useIndex();
  const path = usePathname();
  const item = (href: string, label: string, title?: string) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        title={title}
        className={`rounded px-2 py-1 transition-colors ${
          active ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"
        }`}
      >
        {label}
      </Link>
    );
  };
  return (
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2 font-sans text-sm">
        <Link href="/" className="mr-3 font-semibold tracking-tight text-ink-100">
          learn<span className="text-accent">lab</span>
        </Link>
        {item("/", "Dashboard")}
        <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />
        {index.curriculum.tracks.map((t) => item(`/track/${t.id.toLowerCase()}`, t.id, `Track ${t.id} — ${t.title}`))}
        <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />
        {item("/notes", "Notes")}
        {item("/projects", "Projects")}
      </nav>
    </header>
  );
}
