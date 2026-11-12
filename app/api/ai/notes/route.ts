import { BETAS, checkAccess, clip, errorResponse, getClient, LEARNER, LIMITS, MODEL, sourceBlock } from "@/lib/ai-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { notes, lessonTitle, videoTitle?, transcript?, context? } → { feedback } */
export async function POST(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const notes = clip(body.notes, LIMITS.notes).trim();
  if (!notes) return Response.json({ error: "Write some notes first." }, { status: 400 });
  const lessonTitle = clip(body.lessonTitle, 300);
  const videoTitle = clip(body.videoTitle, 300) || undefined;
  const transcript = clip(body.transcript, LIMITS.transcript);
  const context = clip(body.context, LIMITS.context);

  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: `You review a learner's study notes against the source material, like a sharp, kind TA. ${LEARNER}`,
      messages: [
        {
          role: "user",
          content: `${sourceBlock({ lessonTitle, videoTitle, transcript, context })}

<learner_notes>
${notes}
</learner_notes>

Check these notes against the source${transcript ? " (the transcript is the ground truth for what the video said)" : ""}. Reply in short Markdown with exactly these sections:
**Correct and well put** – 1-3 bullets.
**Errors or fuzzy spots** – each with the fix. Write "None found." if there are none.
**Missing key ideas** – the 1-4 most important things the notes leave out.
**One question to test yourself** – a single question that would expose a gap.
Keep it under 250 words. Quote the learner's words when you correct them.`,
        },
      ],
    });
    if (response.stop_reason === "refusal") return Response.json({ error: "The model declined to review these notes." }, { status: 422 });
    const feedback = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return Response.json({ feedback });
  } catch (err) {
    return errorResponse(err);
  }
}
