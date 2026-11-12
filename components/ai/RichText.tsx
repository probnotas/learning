"use client";
import katex from "katex";
import { Fragment } from "react";

/** Inline: $math$, **bold**, `code`. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\$[^$\n]+\$|\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length > 2 && p.startsWith("$") && p.endsWith("$")) {
          const html = katex.renderToString(p.slice(1, -1), { throwOnError: false, strict: "ignore" });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-black/20 px-1 font-mono text-[0.9em]">{p.slice(1, -1)}</code>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

/** Minimal Markdown for model output: paragraphs, bullet lists, headings-as-bold, inline math. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={`space-y-2.5 ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.replace(/^\s*([-*•]|\d+\.)\s+/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {/^#{1,4}\s/.test(l) ? <strong><Inline text={l.replace(/^#{1,4}\s/, "")} /></strong> : <Inline text={l.replace(/^\s*[-*•]\s+/, "• ")} />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
