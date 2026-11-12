import type Anthropic from "@anthropic-ai/sdk";
import { BETAS, checkAccess, clip, errorResponse, getClient, LEARNER, LIMITS, MODEL, sourceBlock } from "@/lib/ai-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { messages: [{role, content}], lessonTitle, videoTitle?, transcript?, context? } → streamed plain text */
export async function POST(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const history: Anthropic.Beta.BetaMessageParam[] = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-LIMITS.history)
    .filter((m: { role?: string; content?: unknown }) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: clip(m.content, LIMITS.message) }));
  if (!history.length || history[0].role !== "user" || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Send at least one question." }, { status: 400 });
  }
  const lessonTitle = clip(body.lessonTitle, 300);
  const videoTitle = clip(body.videoTitle, 300) || undefined;
  const transcript = clip(body.transcript, LIMITS.transcript);
  const context = clip(body.context, LIMITS.context);

  // The source material goes first and stays identical across turns, so it caches.
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    {
      type: "text",
      text: `You are a tutor sitting next to the learner while they watch and study. ${LEARNER}

Answer their questions using the material below. When the transcript covers it, ground your answer in what the video says (quote briefly when useful) and say roughly where in the video it comes up if you can tell. When you go beyond the material, say so. Be concise: a few short paragraphs at most, with inline LaTeX in $...$ for math. If they ask you to just give the answer to a practice question, help them get there with a hint first.

${sourceBlock({ lessonTitle, videoTitle, transcript, context })}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  try {
    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      messages: history,
    });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n_(The model declined to answer this one.)_"));
        } catch (err) {
          const res = errorResponse(err);
          const msg = ((await res.json()) as { error?: string }).error ?? "Error";
          controller.enqueue(encoder.encode(`\n\n_${msg}_`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });
    return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
