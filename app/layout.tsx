import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { IndexProvider } from "@/components/IndexProvider";
import { loadIndex } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "learnlab",
  description: "Local-first robotics fundamentals, one lesson at a time.",
};

// CURRICULUM.md and lesson files are read at build time; every page is prerendered,
// so nothing touches the filesystem at runtime (works on Vercel / any static host).

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const index = loadIndex();
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint (dark by default). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("learnlab:theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-ink-950">
        <IndexProvider value={index}>
          <main>{children}</main>
        </IndexProvider>
      </body>
    </html>
  );
}
