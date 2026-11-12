import { checkAccess, clip, errorResponse, getClient, LEARNER, LIMITS, MODEL, sourceBlock, stripThinking } from "@/lib/ai-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          choices: { type: "array", items: { type: "string" } },
          answer: { type: "integer", description: "0-based index of the correct choice" },
          explanation: { type: "string" },
        },
        required: ["question", "choices", "answer", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** POST { lessonTitle, videoTitle, transcript?, context? } → { questions, fromTranscript } */
export async function POST(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const lessonTitle = clip(body.lessonTitle, 300);
  const videoTitle = clip(body.videoTitle, 300);
  const transcript = clip(body.transcript, LIMITS.transcript);
  const context = clip(body.context, LIMITS.context);
  if (!videoTitle) return Response.json({ error: "videoTitle is required" }, { status: 400 });

  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 8000,
      reasoning_effort: "medium",
      response_format: { type: "json_schema", json_schema: { name: "video_test", strict: true, schema: SCHEMA } },
      messages: [
        { role: "system", content: `You write short comprehension checks for a self-paced course. ${LEARNER}` },
        {
          role: "user",
          content: `${sourceBlock({ lessonTitle, videoTitle, transcript, context })}

Write a 5-question multiple-choice test the learner takes right after watching "${videoTitle}".
- ${transcript ? "Base every question on what the transcript actually says. Don't test things the video doesn't cover." : "There is no transcript, so base the questions on the core ideas this video is known to cover and on the lesson text, and keep them to its central ideas."}
- Test understanding, not recall of wording: mix "why", "what would happen if", and one small computation where the video supports it.
- Where it fits naturally, tie one question to the compliant pendulum.
- Each question has exactly 4 choices, one clearly correct, with plausible distractors. Vary which position is correct.
- Use plain text with inline LaTeX in $...$ for math.
- explanation: 1-2 sentences on why the answer is right.`,
        },
      ],
    });
    const text = stripThinking(completion.choices[0]?.message?.content ?? "");
    const parsed = JSON.parse(text) as { questions: QuizQuestion[] };
    const questions = parsed.questions
      .filter((q) => Array.isArray(q.choices) && q.choices.length >= 2 && q.answer >= 0 && q.answer < q.choices.length)
      .slice(0, 6);
    if (questions.length < 3) return Response.json({ error: "The generated test was incomplete. Try regenerating." }, { status: 502 });
    return Response.json({ questions, fromTranscript: !!transcript });
  } catch (err) {
    if (err instanceof SyntaxError) return Response.json({ error: "Couldn't read the generated test. Try regenerating." }, { status: 502 });
    return errorResponse(err);
  }
}
