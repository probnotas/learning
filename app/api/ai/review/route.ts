import { checkAccess, clip, errorResponse, getClient, LEARNER, LIMITS, MODEL, stripThinking } from "@/lib/ai-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { lessonTitle, context, rubric, paper } → { review } (a reviewer-style critique against the rubric) */
export async function POST(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const paper = clip(body.paper, 60_000).trim();
  if (paper.split(/\s+/).length < 60) return Response.json({ error: "Write more of the paper first." }, { status: 400 });
  const lessonTitle = clip(body.lessonTitle, 300);
  const context = clip(body.context, LIMITS.context);
  const rubric = clip(body.rubric, 8_000);

  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 6000,
      reasoning_effort: "medium",
      messages: [
        {
          role: "system",
          content: `You are a demanding but constructive reviewer at a robotics research lab (think a world-model or humanoid team) reading a portfolio project write-up. ${LEARNER}`,
        },
        {
          role: "user",
          content: `<project_brief title="${lessonTitle.replace(/"/g, "'")}">
${context}
</project_brief>

<rubric>
${rubric}
</rubric>

<paper>
${paper}
</paper>

Review the paper as you would a workshop submission. Reply in short Markdown:
**Scores** – one bullet per rubric item: "item – n/5 – one-line reason".
**Strongest part** – one or two sentences.
**Top 3 fixes before this goes in a portfolio** – concrete and specific (missing baseline, unsupported claim, unclear figure, etc.).
**Questions a lab engineer would ask you** – 2-3 questions.
Don't invent results that aren't in the paper. Keep it under 350 words.`,
        },
      ],
    });
    const review = stripThinking(completion.choices[0]?.message?.content ?? "");
    if (!review) return Response.json({ error: "The model returned an empty review. Try again." }, { status: 502 });
    return Response.json({ review });
  } catch (err) {
    return errorResponse(err);
  }
}
