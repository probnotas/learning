import type Groq from "groq-sdk";
import { checkAccess, clip, errorResponse, getClient, LEARNER, LIMITS, MODEL, sourceBlock } from "@/lib/ai-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { messages: [{role, content}], lessonTitle, videoTitle?, transcript?, context? } → streamed plain text */
export async function POST(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const history: Groq.Chat.ChatCompletionMessageParam[] = (Array.isArray(body.messages) ? body.messages : [])
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

  const system = `You are a tutor sitting next to the learner while they watch and study. ${LEARNER}

Answer their questions using the material below. When the transcript covers it, ground your answer in what the video says (quote briefly when useful) and say roughly where in the video it comes up if you can tell. When you go beyond the material, say so. Be concise: a few short paragraphs at most, with inline LaTeX in $...$ for math. If they ask you to just give the answer to a practice question, help them get there with a hint first.

${sourceBlock({ lessonTitle, videoTitle, transcript, context })}`;

  try {
    const stream = await getClient().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 4000,
      reasoning_effort: "low",
      stream: true,
      messages: [{ role: "system", content: system }, ...history],
    });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Hide any <think>…</think> block a reasoning model streams into the content.
        let inThink = false;
        let pending = "";
        try {
          for await (const chunk of stream) {
            pending += chunk.choices[0]?.delta?.content ?? "";
            let out = "";
            for (;;) {
              if (inThink) {
                const end = pending.indexOf("</think>");
                if (end < 0) { pending = pending.slice(-8); break; }
                pending = pending.slice(end + 8);
                inThink = false;
              } else {
                const start = pending.indexOf("<think>");
                if (start < 0) {
                  const keep = pending.lastIndexOf("<");
                  const safe = keep >= 0 && pending.length - keep < 7 ? keep : pending.length;
                  out += pending.slice(0, safe);
                  pending = pending.slice(safe);
                  break;
                }
                out += pending.slice(0, start);
                pending = pending.slice(start + 7);
                inThink = true;
              }
            }
            if (out) controller.enqueue(encoder.encode(out));
          }
          if (!inThink && pending) controller.enqueue(encoder.encode(pending));
        } catch (err) {
          const res = errorResponse(err);
          const msg = ((await res.json()) as { error?: string }).error ?? "Error";
          controller.enqueue(encoder.encode(`\n\n_${msg}_`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.controller.abort();
      },
    });
    return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
