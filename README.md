# learnlab

A local-first learning platform that turns [`CURRICULUM.md`](CURRICULUM.md) into a lesson-by-lesson course for robotics fundamentals. Every lesson has the same five parts: why it matters for the self-model / compliant-pendulum work, what to watch or read, core ideas, a problem set, and a build you write and run in the browser.

No backend, no accounts, no database. Progress lives in your browser's `localStorage`.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>. `npm install` also copies the Monaco editor into `public/monaco/` (a `postinstall` step), so the editor never loads from a CDN.

Other scripts:

| Command | What it does |
|---|---|
| `npm run check:content` | Validates every lesson: five sections present, 5–10 problems each with a solution, build files exist, **every reference solution passes its tests**, and every starter fails at least one. Run it after editing content. |
| `node scripts/make-starter.mjs <lessonId>` | Regenerates a lesson's `starter.js` from its `solution.js` (see "Adding a lesson"). |
| `npm run build && npm start` | Production build. |

## What's in it

- **Dashboard (`/`)**: overall progress, the current month of the 6-month path, a streak, "Next up" and "Jump back in" buttons, every month's lessons, the parsed dependency graph, and the Year 2 list.
- **Tracks (`/track/a` … `/track/f`)**: each topic from CURRICULUM.md with its resources, its prerequisites (green = done, amber = missing), and its lessons.
- **Lessons (`/lesson/<id>`)**: the five sections, with a sticky checklist beside them and a "My notes" box at the bottom.
- **Notes (`/notes`)**: a cross-lesson notebook, all lesson notes in one place, and a Markdown export.
- **Projects (`/projects`)**: the Compliant Pendulum Playground project, a build log you can tie to lessons, and the status of every lesson build.

### Content written so far

| Month | Lessons | Status |
|---|---|---|
| 1 · A1 Linear algebra | Vectors & forward pass · Solving Ax = b · Least squares · Eigenvalues | Fully written |
| 2 · B1 + start of A2 | Derivatives from data · Harmonic oscillator · Complex numbers · Resonance & transients | Fully written |
| 3 · A2 | Derivatives & autodiff | Fully written |
| 3 · A2 | Integration · Taylor series | Stub |
| 4 · A4 | Second-order ODEs · Laplace transform | Stub (Build points to the pendulum project) |
| 5 · C2 | Control Bootcamp | Stub |
| 6 · F1–F3 | World models · Self-modeling · Change detection | Stub |
| Year 2 | A3, B2, C1, C3, D1–D3, E1–E3 | Stub |

Stubs have real Watch / Read links and a "Why this matters" paragraph. Their other sections say "Not yet drafted — generate on demand", and they have a **Generate full lesson** button wired to `POST /api/generate-lesson`. That route is a TODO stub that returns 501; see `app/api/generate-lesson/route.ts` for the intended design.

Every full lesson's build ties back to the pendulum. The first one, in Month 1, has you write matrix-vector multiply and then hand-build an MLP whose forward pass reproduces the linearized pendulum's next-state prediction.

## How CURRICULUM.md is used

`lib/curriculum.ts` reads `CURRICULUM.md` on every request, so edits show up on refresh. It parses:

- **Goal, learning style, ordering rule**: the `**Goal:**`, `**Learning style:**` and `**Ordering rule:**` paragraphs.
- **Tracks and topics**: `## Track X — Name` headings, and topic bullets like `- **A1. Linear Algebra**`, with their sub-bullets as resources.
- **Dependency graph**: the code block under `## Dependency Graph`. Each line is a chain separated by `→`. `+` joins several prerequisites. A bare track letter (`A`) means every topic in that track. `(needs X)` adds X as an extra prerequisite of the topic just before it. Any other parenthetical is a comment. With the fixes already in the file, this gives A2 → A4 (not A3 → A4), and C2 requires A1 + A4 (C1 is not a prerequisite).
- **6-month path**: the month table under `## Minimum Viable Path`. Topic IDs are pulled from the Focus column; the Scope column is shown on the dashboard.

The `## Progress` table at the bottom of CURRICULUM.md is **not** read. The app keeps its own progress (see below).

### Locking rules

A lesson is locked until all three of these hold:

1. Every **prerequisite topic** from the dependency graph is complete (all of its lessons are complete).
2. Every **earlier lesson in the same topic** is complete. This enforces "finish one resource before the next".
3. Every lesson in its `requires:` frontmatter is complete. This is used for the one lesson-level rule CURRICULUM.md states in prose: Month 2 says "3Blue1Brown Essence of Calculus first (needed for Feynman)", so the Feynman lessons require the calculus-intuition lesson.

Hover a locked lesson to see which prerequisite is missing. Inside a locked lesson there's an "Unlock anyway…" link behind a confirm dialog. An overridden lesson stays visibly marked until its prerequisites are actually done.

### Completion rule

A lesson can be marked complete only when **all** of these are checked:

- every Watch / Read item,
- every problem,
- the build, which only becomes checkable after its tests have passed at least once (it's ticked automatically on the first fully passing run).

The lesson's state is `not_started → watching → problems_done → build_done → complete`. "Mark lesson complete" stays disabled until the conditions above hold. A topic is complete when all its lessons are. Stub lessons can't be completed until their problem set and build are written. That's intentional: no topic counts as done without problem sets.

## Adding or finishing a lesson

1. Create `content/lessons/<track>-<topicNumber>-<slug>.mdx`, for example `a-2-integration.mdx` for topic A2. Lesson IDs are the filename.
2. Frontmatter:

   ```yaml
   ---
   title: "Integrals — from acceleration back to motion"
   topic: A2            # must exist in CURRICULUM.md
   month: 3             # 6-month-path month; omit for Year 2
   order: 10            # sort order (within the month / topic)
   status: full         # or "stub"
   hours: 8
   requires: [a-2-derivatives]   # optional extra lesson prerequisites
   summary: "One sentence."
   ---
   ```

3. Body: five `##` sections in this order: `Why this matters`, `Watch / Read`, `Core ideas`, `Problem set`, `Build`. MDX components available:

   | Component | Use |
   |---|---|
   | `<Watch id="v1" title="…" youtube="VIDEO_ID" start={90} minutes={12}>note</Watch>` | YouTube embed (click-to-load, youtube-nocookie). Use `playlist="…"` instead of `youtube` for a playlist. Each one is a checklist item. |
   | `<Read id="r1" title="…" href="https://…" where="§3.2, pp. 41–49">note</Read>` | External reading. Also a checklist item. |
   | `<Problem id="p1" kind="concept\|compute\|derive\|estimate" title="…">…<Solution>…</Solution></Problem>` | Problem with a reveal. `<Hint>` is optional. |
   | `<Build />` | Monaco editor + runner, fed from `content/builds/<lessonId>/`. |
   | `<Callout title="…">`, `<ProjectLink id="compliant-pendulum">`, `<NotDrafted section="Core ideas" />` | Extras. |

   Math is KaTeX: `$…$` inline and `$$…$$` display. In MDX, write `\lt` / `\gt` for `<` / `>` inside math, and avoid bare `{` `}` in prose.

4. Build files in `content/builds/<lessonId>/`:
   - `solution.js`: the reference implementation plus any demo code. Put `// @todo hint text` directly above each top-level function the learner should write. Use ` | ` to split the hint over several lines.
   - `tests.js`: `test(name, fn)` cases using `assert`, `assertClose(a, b, tol)` and `assertArrayClose(a, b, tol)`.
   - `starter.js`: generate it with `node scripts/make-starter.mjs <lessonId>`. It replaces each `@todo` function body with the hint and a `throw new Error("TODO")`.

   Build code is plain JavaScript run in a sandboxed Web Worker (`public/harness-worker.js`) with an 8-second timeout. `console.log(...)` and `plot([{ name, x, y, points? }], { title, xlabel, ylabel })` show up under the editor.

5. Run `npm run check:content`.

## How progress is stored

Everything is one JSON object in `localStorage` under the key **`learnlab:v1`** (see `lib/progress.ts` for the types):

```ts
{
  version: 1,
  lessons: { [lessonId]: { watched: {id: bool}, problems: {id: bool}, buildPassed, buildDone,
                           completeFlag, notes, code, override, lastVisited } },
  activityDays: ["2026-11-12", ...],   // local dates with any check-off or edit; drives the streak
  lastLessonId: "a-1-eigen",           // "Jump back in"
  notebook: "…",                       // /notes free-form text
  buildLog: [{ id, date, lessonId, projectId, text }]
}
```

Things to know:

- Storage is per browser **and per origin**. `localhost:3000` and `localhost:3001` are separate. Clearing site data erases your progress.
- Open tabs stay in sync through the `storage` event.
- **Back up** with Notes → "Export all notes (.md)" for notes. For everything else, run this in the browser console: `copy(localStorage.getItem("learnlab:v1"))`, and restore with `localStorage.setItem("learnlab:v1", <pasted string>)`.
- Lessons are matched by ID, so renaming a lesson file orphans its progress.

## The pendulum project

`/projects/compliant-pendulum` embeds `public/playground/compliant-pendulum-playground.html` in a sandboxed iframe if that file exists, and shows drop-in instructions if it doesn't. Build the playground separately (single HTML file, vanilla JS + canvas) and put it at that path. The Month 2 resonance lesson and both Month 4 lessons link to it.

## Privacy and network

The app makes no tracking, analytics or font requests. Monaco, KaTeX and its fonts are served from your own machine. Fonts are system fonts.

YouTube is only contacted when you press a video's play button (embeds use `youtube-nocookie.com`). External reading links open in a new tab when you click them. "Generate full lesson" calls the app's own local API route.

## Known limitations

- **No copyrighted material is mirrored, and none can be.** MIT OCW videos and notes, textbooks (ROB 101, Feynman, Strogatz, Sutton & Barto, Isermann) and papers are *linked*, never copied. Embedded videos come only from official YouTube channels (3Blue1Brown, Steve Brunton, Walter Lewin, DeepMind, Cornell/Strogatz, MIT OCW, Stanford Online, MIT 6.S191). Lesson text, core-idea summaries, problem sets, solutions and builds are original. As a result:
  - links can break or move, and nothing works offline except the original content;
  - some sources are paywalled (Bongard et al. 2006, Page 1954, Isermann, Blickhan 1989) and are marked as such;
  - section and page references are given where verified (ROB 101: Winter 2023 PDF, printed page numbers; 18.01SC/18.03SC session names; Feynman section titles). Re-check them if a source publishes a new edition.
- **Links that could not be verified from the build environment:** feynmanlectures.caltech.edu, Basseville & Nikiforov's PDF page and journals.biologists.com refused automated requests (likely bot protection), so they're linked from their known URLs. **No public ROB 311 or ROB 450 materials were found**, and those stubs say so instead of guessing.
- **Builds are JavaScript, not Python.** Running Python in the browser (Pyodide) would mean downloading tens of MB of runtime plus NumPy from a CDN, which breaks the local-first, no-third-party-network rule. The lessons are written so the JS reads like NumPy-free Python. The C2 lesson's "code each example in Python" can still be done offline alongside the app.
- **Self-reported checkboxes.** Watch/Read and problems are honor-system. The build checkbox needs a passing test run, but revealing the reference solution and pasting it would also pass.
- **"Generate full lesson" is a stub** (`/api/generate-lesson` returns 501 with a TODO describing the intended implementation).
- **Dependency-graph grammar is small.** The parser handles the constructs currently in CURRICULUM.md (chains, `+`, track letters, `(needs X)`, comment parentheticals). Other syntax is ignored, so keep the graph in this style.
- **Several lessons per topic.** The 6-month path splits topics across months (A2 starts in Month 2 and continues in Month 3), so a topic can have several unit-level lessons. Files are named `[trackId]-[topicId]-[slug].mdx`. That's the requested `[trackId]-[topicId]` pattern with a unit suffix.
- **3Blue1Brown's linear algebra series now has 16 chapters.** The 12 assigned across Month 1 are chapters 1–9 and 13–15. Chapters 10–12 and 16 are optional.
- **Desktop-first.** It works in a narrow window, but it isn't designed for phones.
