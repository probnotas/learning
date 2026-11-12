/** Render the tiny subset of markdown used in CURRICULUM.md prose: **bold**, `code`, and bare links. */
export function InlineMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/\S+|\b[a-z0-9.-]+\.(?:edu|org|com|ai)\b)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
        if (/^https?:\/\//.test(part) || /^[a-z0-9.-]+\.(edu|org|com|ai)$/.test(part)) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
