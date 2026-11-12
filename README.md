# learnlab

A local-first course built from [`CURRICULUM.md`](CURRICULUM.md). Units come from the curriculum's topics and live as buildings on a campus map. Each lesson is a short sequence of mini-items: a "why this matters" article, videos, readings, a key-ideas article, an auto-graded **practice** set, and a coded **build**. You pass a lesson only when every item is done, **every practice question is answered correctly**, and every build test passes.

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
| `npm run build && npm start` | Production build: copies Monaco, then prerenders every page. |

## What's in it

- **The campus (`/`, `/unit/<topic>`)**: the whole course is a world map (`public/world/campus.webp`). Every unit on the 6-month path is a building: A1 Robotics Lab, A2 The Ring, B1 Resonance Dome, A4 Oscillator Hall, C2 Control Center, F1 World Model Observatory, F2 Self-Model Institute, F3 Lagoon Monitoring Station. Year 2 is a planned district on the hillside.
  - **Bottom bar:** every unit, in path order. Year 2 units are smaller, after the divider. A ring shows each unit's progress; ✓ means mastered.
  - **Pick a unit** (bar or building): the camera flies into that building, and a light beam marks it. The ⌖ button or Esc zooms back out.
  - **Left rail:** the lessons in that unit (✓ passed, 🔒 locked), plus Notebook, Projects and the theme toggle.
  - **Right card:** the selected lesson (‹ 02 / 04 ›). Before you start it shows XP available, time and difficulty; once started it shows performance, items done and XP earned. Its button reads Start, Continue, Review, or Locked (with the reason and "Unlock anyway…").
  - **Level pill (✦ L0):** total XP. XP is derived from your progress, 1000 XP per level.
- **Lessons (`/lesson/<id>/<item>`)**: one big card plays the lesson's items in order (video, article, reading, practice, build), with story-style progress segments along the bottom (click to jump; ← → keys work too). The **Notes** panel sits beside it and saves as you type. `/lesson/<id>` jumps to your first unfinished item.
- **Practice**: numeric answer boxes (fractions like `7/6`, `pi`, `sqrt()` and scientific notation are accepted; tolerances are set per question) and multiple choice. Wrong answers turn red and can be retried as many times as you need. After one wrong try you can open the worked solution. The practice set passes when every question is green.
- **Build**: Monaco editor + Run. It passes when every test passes.
- **Notebook (`/notes`)** and **Projects (`/projects`)**: all your notes with Markdown export; the pendulum project and a build log.
- **Theme**: dark by default, with a ☀/☾ toggle (remembered). The lesson card is always deep green.

To move a unit to a different building, edit the coordinates in `lib/world.ts` (fractions of the image width and height).

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

Stubs have a real "Why this matters" article and Watch / Read items. Their key-ideas, practice and build items are marked "not written yet" and show a **Generate full lesson** button wired to `POST /api/generate-lesson`. That route is a TODO stub that returns 501; see `app/api/generate-lesson/route.ts` for the intended design.

Every full lesson's build ties back to the pendulum. The first one, in Month 1, has you write matrix-vector multiply and then hand-build an MLP whose forward pass reproduces the linearized pendulum's next-state prediction.

## How CURRICULUM.md is used

`lib/curriculum.ts` reads `CURRICULUM.md`. In `npm run dev` it's re-read on every request, so edits show up on refresh. In a production build every page is prerendered, so edits need a rebuild (a redeploy on Vercel). It parses:

- **Goal, learning style, ordering rule**: the `**Goal:**`, `**Learning style:**` and `**Ordering rule:**` paragraphs.
- **Tracks and topics**: `## Track X — Name` headings, and topic bullets like `- **A1. Linear Algebra**`, with their sub-bullets as resources.
- **Dependency graph**: the code block under `## Dependency Graph`. Each line is a chain separated by `→`. `+` joins several prerequisites. A bare track letter (`A`) means every topic in that track. `(needs X)` adds X as an extra prerequisite of the topic just before it. Any other parenthetical is a comment. With the fixes already in the file, this gives A2 → A4 (not A3 → A4), and C2 requires A1 + A4 (C1 is not a prerequisite).
- **6-month path**: the month table under `## Minimum Viable Path`. Topic IDs are pulled from the Focus column; the Scope column is shown on the dashboard.

The `## Progress` table at the bottom of CURRICULUM.md is **not** read. The app keeps its own progress (see below).

### Units, locking and passing

Each CURRICULUM.md topic is a unit (A1 → "Unit 1: Linear Algebra"). Units are ordered by where their first lesson sits on the 6-month path.

A lesson is locked until all three of these hold:

1. Every **prerequisite topic** from the dependency graph is passed (all of its lessons passed).
2. Every **earlier lesson in the same unit** is passed. This enforces "finish one resource before the next".
3. Every lesson in its `requires:` frontmatter is passed. Month 2 says "3Blue1Brown Essence of Calculus first (needed for Feynman)", so the Feynman lessons require the calculus-intuition lesson.

Inside a locked lesson there's an "Unlock anyway…" link behind a confirm dialog. An overridden lesson stays visibly marked until its prerequisites are passed.

**Passing is automatic.** A lesson passes the moment all of its items are done: articles, videos and readings marked done; every practice question correct; build tests passing. Unit mastery is the share of done items across the unit. Stub lessons can't pass until their practice and build exist.

## Adding or finishing a lesson

1. Create `content/lessons/<track>-<topicNumber>-<slug>.mdx`, for example `a-2-integration.mdx` for topic A2. The filename is the lesson ID.
2. Frontmatter:

   ```yaml
   ---
   title: "Integrals — from acceleration back to motion"
   topic: A2            # must exist in CURRICULUM.md
   month: 3             # 6-month-path month; omit for Year 2
   order: 10            # order within the unit / path
   status: full         # or "stub"
   hours: 8
   requires: [a-2-derivatives]   # optional extra lesson prerequisites
   summary: "One sentence."
   ---
   ```

3. Body: **a sequence of item tags and nothing else** (the checker rejects stray text). Each item becomes one page, in file order:

   ```mdx
   <Article id="why" title="Why this matters for your self-model">
   Short markdown + $math$ …
   </Article>

   <Watch id="v1" title="Ch 1 · Vectors" youtube="VIDEO_ID" start={90} minutes={10}>Optional note.</Watch>
   <Read id="r1" title="ROB 101 · §3" href="https://…" where="pp. 41–49">Optional note.</Read>

   <Article id="ideas" title="Key ideas: …">
   - bullet …
   </Article>

   <Quiz id="practice" title="Practice: …">

   <Q id="p1" title="Short title" answer="4;6" labels="first;second" tol="0.01">
   Question text with $math$.
   <Solution>Worked solution.</Solution>
   </Q>

   <Q id="p2" title="Short title" choice="b">
   Question text.
   <Choice v="a">Wrong option</Choice>
   <Choice v="b">Right option with $x^2$</Choice>
   <Solution>Why b.</Solution>
   </Q>

   </Quiz>

   <Build id="build" title="Build: …">
   Intro text, then the editor appears below. <Callout> / <ProjectLink id="compliant-pendulum"> can go here too.
   </Build>
   ```

   - `answer` takes one or more numbers separated by `;`, one input box each. `labels` and `tol` use the same `;` order. `tol` is relative and defaults to 1%.
   - Keep each `<Choice>` on one line, and use inline math only inside choices.
   - Add `draft` to any item that isn't written yet: `<Quiz id="practice" title="Practice" draft />`.
   - Use `$…$` / `$$…$$` for KaTeX. Write `\lt` / `\gt` inside math, and avoid bare `{` `}` in prose.

4. Build files in `content/builds/<lessonId>/`:
   - `solution.js`: the reference implementation plus any demo code. Put `// @todo hint text` directly above each top-level function the learner should write. Use ` | ` to split the hint over several lines.
   - `tests.js`: `test(name, fn)` cases using `assert`, `assertClose(a, b, tol)` and `assertArrayClose(a, b, tol)`.
   - `starter.js`: generate it with `node scripts/make-starter.mjs <lessonId>`.

   Build code is plain JavaScript run in a sandboxed Web Worker (`public/harness-worker.js`) with an 8-second timeout. `console.log(...)` and `plot([{ name, x, y, points? }], { title, xlabel, ylabel })` show up under the editor.

5. Run `npm run check:content`. It checks item structure, 5–10 questions per practice set, that every question has an answer (or a valid correct choice) and a solution, and that reference solutions pass their tests.

## How progress is stored

Everything is one JSON object in `localStorage` under the key **`learnlab:v2`** (see `lib/progress.ts` for the types). The theme choice is stored separately under `learnlab:theme`.

```ts
{
  version: 2,
  lessons: { [lessonId]: { items: {itemId: bool},                       // articles / videos / readings done
                           answers: {questionId: {values, correct, attempts}},
                           buildPassed, code, notes, override, lastItem, lastVisited } },
  activityDays: ["2026-11-12", ...],   // local dates with any answer, check-off or edit; drives the streak
  lastLessonId: "a-1-eigen",           // "Jump back in"
  notebook: "…",                       // /notes free-form text
  buildLog: [{ id, date, lessonId, projectId, text }]
}
```

Things to know:

- Storage is per browser **and per origin**. `localhost:3000` and `localhost:3001` are separate. Clearing site data erases your progress.
- Open tabs stay in sync through the `storage` event.
- **Back up** with Notes → "Export all notes (.md)" for notes. For everything else, run this in the browser console: `copy(localStorage.getItem("learnlab:v2"))`, and restore with `localStorage.setItem("learnlab:v2", <pasted string>)`.
- Lessons are matched by ID and questions by question ID, so renaming either orphans its progress.

## The pendulum project

`/projects/compliant-pendulum` embeds `public/playground/compliant-pendulum-playground.html` in a sandboxed iframe if that file exists, and shows drop-in instructions if it doesn't. Build the playground separately (single HTML file, vanilla JS + canvas) and put it at that path. The Month 2 resonance lesson and both Month 4 lessons link to it.

## Deploying to Vercel

The app is set up so a Vercel deploy is just the default Next.js build:

1. In Vercel: **Add New → Project →** import this GitHub repo.
2. Settings (the defaults are correct; only change them if a previous attempt edited them):
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (the repo root, where `package.json` and `CURRICULUM.md` live)
   - **Build Command:** `npm run build` (or leave the default)
   - **Install Command:** default (`npm install`)
   - **Output Directory:** default (leave empty; *don't* set `out` or `public`)
   - **Node.js Version:** 22.x (pinned in `package.json`)
   - No environment variables are needed.
3. Deploy. If a deploy fails, the error is in the **Build Logs**. Copy the first red error line and that's usually enough to fix it.

Why it works on Vercel:

- **Every page is prerendered at build time** (`generateStaticParams` for units, lessons and items), so `CURRICULUM.md` and `content/` are read only during the build. At runtime nothing touches the filesystem, so serverless functions can't fail on missing files. Unknown URLs get a proper 404.
- **Monaco is copied in the build step itself** (`npm run build` runs `scripts/copy-monaco.mjs` first), so it doesn't depend on `postinstall` running or on Vercel's install cache. `public/monaco/` stays out of git.
- The only server code left is `POST /api/generate-lesson` (the TODO stub), which needs no files or secrets.
- Tested with a clean checkout: `npm ci`, then `npm run build`, then `next start` with `content/` and `CURRICULUM.md` deleted. All pages return 200, unknown URLs 404, and there are no server errors.

After deploying:

- **Progress is per site.** `localStorage` on `your-app.vercel.app` is separate from `localhost:3000`. To move progress, use the backup/restore console snippet in "How progress is stored".
- **Content changes need a redeploy.** Push to the branch Vercel watches and it rebuilds automatically.
- **It's a public URL** unless you turn on Vercel's Deployment Protection. There's no login, but progress stays in each visitor's own browser, so nobody sees yours.

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
- **What's enforced and what isn't.** Practice answers and builds are checked automatically. Videos and readings are honor-system ("I watched it" / "I read it"), since the app can't see YouTube or external sites. Answers are checked in the browser, so they're visible in the page source; worked solutions open after one wrong try, and the build's reference solution can be revealed. The rule is yours to keep.
- **Practice questions are fixed, not randomized.** Retrying a question you got wrong shows the same numbers.
- **"Generate full lesson" is a stub** (`/api/generate-lesson` returns 501 with a TODO describing the intended implementation).
- **Dependency-graph grammar is small.** The parser handles the constructs currently in CURRICULUM.md (chains, `+`, track letters, `(needs X)`, comment parentheticals). Other syntax is ignored, so keep the graph in this style.
- **Several lessons per topic.** The 6-month path splits topics across months (A2 starts in Month 2 and continues in Month 3), so a topic can have several unit-level lessons. Files are named `[trackId]-[topicId]-[slug].mdx`. That's the requested `[trackId]-[topicId]` pattern with a unit suffix.
- **3Blue1Brown's linear algebra series now has 16 chapters.** The 12 assigned across Month 1 are chapters 1–9 and 13–15. Chapters 10–12 and 16 are optional.
- **Desktop-first.** The campus and lesson views are built for a laptop or desktop screen; on a phone the card and rails crowd the map.
- **The campus image is 1672×941 px**, so zoomed-in buildings look a little soft. A larger render of the same image dropped in at `public/world/campus.webp` (same aspect ratio) sharpens it with no code changes.
- **Progress from the previous version doesn't carry over.** Storage moved from `learnlab:v1` to `learnlab:v2` because lessons became item sequences.
