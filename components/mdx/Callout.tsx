import Link from "next/link";

export function Callout({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-5 rounded-md border border-accent-dim/60 bg-accent/5 px-4 py-3">
      {title && <p className="not-prose mb-1 font-sans text-sm font-semibold text-accent">{title}</p>}
      <div className="callout-body">{children}</div>
    </div>
  );
}

const PROJECTS: Record<string, string> = {
  "compliant-pendulum": "Compliant Pendulum Playground",
};

export function ProjectLink({ id, children }: { id: string; children?: React.ReactNode }) {
  return (
    <div className="not-prose my-5 rounded-lg border border-good/40 bg-good/5 p-4 font-sans">
      <p className="text-xs uppercase tracking-widest text-good">Project</p>
      <Link href={`/projects/${id}`} className="mt-1 block text-base font-semibold text-ink-100 hover:underline">
        {PROJECTS[id] ?? id} →
      </Link>
      {children && <div className="mt-1 font-serif text-sm text-ink-300">{children}</div>}
    </div>
  );
}
