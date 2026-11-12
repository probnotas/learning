import { NextResponse } from "next/server";

/**
 * Placeholder for on-demand lesson generation.
 *
 * TODO(llm): implement. Sketch:
 *   1. Read content/lessons/<lessonId>.mdx (the stub) and CURRICULUM.md for scope.
 *   2. Call an LLM with the five-section lesson contract (see README "Adding a lesson")
 *      and a fully written lesson as a style example.
 *   3. Write the MDX + content/builds/<lessonId>/{starter,tests,solution}.js,
 *      then run `npm run check:content` before accepting the result.
 * Keep it local-only: the API key should come from an env var, never the browser.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    {
      ok: false,
      lessonId: body?.lessonId ?? null,
      message:
        "Not implemented yet. This button is wired to /api/generate-lesson, which is a TODO stub. Until then, ask Claude to draft this lesson and drop the MDX + build files into content/.",
    },
    { status: 501 },
  );
}
