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

function lessonInstructions(lessonTitle: string, count: number, hasTranscript: boolean) {
  return `Write the ${count}-question end-of-lesson test for "${lessonTitle}". The learner has finished the videos, readings, practice and build, so test whether they can USE the lesson, not whether they remember it:
- Questions 1 and 2: the lesson's two most important concepts ("why" or "what would happen if").
- Question 3: a short computation with concrete numbers, like the lesson's practice problems.
- Question 4: a work scenario: apply the lesson to the compliant pendulum or to a self-model / world-model research decision.
- Only use material the lesson covers${hasTranscript ? " (the transcripts show what the videos said)" : ""}.`;
}

function videoInstructions(videoTitle: string, count: number, hasTranscript: boolean) {
  return `Write a ${count}-question multiple-choice test the learner takes right after watching "${videoTitle}".
- ${hasTranscript ? "Base every question on what the transcript actually says. Don't test things the video doesn't cover." : "There is no transcript, so base the questions on the core ideas this video is known to cover and on the lesson text, and keep them to its central ideas."}
- Test understanding, not recall of wording: mix "why", "what would happen if", and one small computation where the video supports it.
- Where it fits naturally, tie one question to the compliant pendulum.`;
}

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** POST { mode?: "video" | "lesson", lessonTitle, videoTitle?, transcript?, context? } → { questions, fromTranscript }
 *  video: 5 questions on one video. lesson: 4 questions on the whole lesson (the end-of-lesson test). */
export async function POST(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const lessonTitle = clip(body.lessonTitle, 300);
  const videoTitle = clip(body.videoTitle, 300);
  const transcript = clip(body.transcript, LIMITS.transcript);
  const context = clip(body.context, LIMITS.context);
  const mode = body.mode === "lesson" ? "lesson" : "video";
  if (mode === "video" && !videoTitle) return Response.json({ error: "videoTitle is required" }, { status: 400 });
  const count = mode === "lesson" ? 4 : 5;

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
          content: `${sourceBlock({ lessonTitle, videoTitle: videoTitle || undefined, transcript, context })}

${mode === "lesson" ? lessonInstructions(lessonTitle, count, !!transcript) : videoInstructions(videoTitle, count, !!transcript)}
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
