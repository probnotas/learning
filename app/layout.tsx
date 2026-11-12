import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { IndexProvider } from "@/components/IndexProvider";
import { Nav } from "@/components/Nav";
import { loadIndex } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "learnlab",
  description: "Local-first robotics fundamentals, one lesson at a time.",
};

// CURRICULUM.md and lesson files are read on each request, so edits show up on refresh.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const index = loadIndex();
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950">
        <IndexProvider value={index}>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </IndexProvider>
      </body>
    </html>
  );
}
