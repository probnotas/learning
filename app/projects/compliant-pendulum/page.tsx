import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { listLessons } from "@/lib/lessons";
import { PROJECTS } from "@/lib/projects";

export default function CompliantPendulumPage() {
  const project = PROJECTS.find((p) => p.id === "compliant-pendulum")!;
  const exists = fs.existsSync(path.join(process.cwd(), "public", project.file!));
  const lessons = listLessons().filter((l) => project.lessons.includes(l.id));

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-widest text-good">Project</p>
      <h1 className="mt-1 font-serif text-3xl text-ink-100">{project.title}</h1>
      <p className="mt-2 max-w-3xl font-serif text-ink-300">{project.summary}</p>

      <div className="mt-4 rounded-md border border-ink-800 bg-ink-900 p-4 font-mono text-sm text-ink-200">
        <p>I θ̈ₐ = k(θₘ − θₐ) − m g L sin θₐ − c θ̇ₐ, &nbsp; I = mL², &nbsp; θₘ = A sin(ω t)</p>
        <p className="mt-1 text-ink-400">Linearized: ω_n = √((k + mgL)/(mL²)). Gravity adds stiffness, and mass appears in both numerator and denominator.</p>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2 font-sans text-sm">
        {lessons.map((l) => (
          <li key={l.id}>
            <Link href={`/lesson/${l.id}`} className="rounded-md border border-ink-700 px-2 py-1 text-ink-300 hover:border-ink-400">
              {l.topic} · {l.title}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {exists ? (
          <iframe
            src={project.file}
            title={project.title}
            className="h-[820px] w-full rounded-lg border border-ink-700 bg-black"
            sandbox="allow-scripts"
          />
        ) : (
          <div className="rounded-lg border border-dashed border-ink-700 p-8 font-sans text-sm text-ink-300">
            <p className="font-semibold text-ink-100">Playground not added yet.</p>
            <p className="mt-2">
              Build <code className="font-mono text-warn">compliant-pendulum-playground.html</code> separately (single
              file, vanilla JS + canvas), then drop it at:
            </p>
            <pre className="mt-3 rounded bg-ink-900 p-3 font-mono text-xs text-ink-200">public{project.file}</pre>
            <p className="mt-3">Refresh this page and it will be embedded here in a sandboxed iframe.</p>
          </div>
        )}
      </div>
    </div>
  );
}
