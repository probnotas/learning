import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// One model for everything; effort is tuned per route.
export const MODEL = "claude-opus-5-5";
// Server-side refusal fallback: if a request is declined, the API retries it on
// Anthropic's recommended fallback model inside the same call.
export const BETAS: Anthropic.Beta.AnthropicBeta[] = ["server-side-fallback-2026-07-01"];

// Size caps so a public deployment can't be used to send huge prompts.
export const LIMITS = { transcript: 80_000, context: 20_000, notes: 20_000, message: 4_000, history: 24 };

export function aiConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** Optional shared secret: set LEARNLAB_ACCESS_CODE and the browser must send it. */
export function checkAccess(req: Request): Response | null {
  if (!aiConfigured()) {
    return Response.json(
      { error: "AI is off: set ANTHROPIC_API_KEY (in .env.local locally, or in Vercel's Environment Variables) and restart." },
      { status: 501 },
    );
  }
  const code = process.env.LEARNLAB_ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return Response.json({ error: "Access code required.", needsCode: true }, { status: 401 });
  }
  return null;
}

export function clip(s: unknown, max: number): string {
  const str = typeof s === "string" ? s : "";
  return str.length > max ? str.slice(0, max) : str;
}

/** Shared framing: the learner, the lesson, and (optionally) the video transcript. */
export function sourceBlock(p: { lessonTitle: string; videoTitle?: string; transcript?: string; context?: string }): string {
  const parts = [`<lesson title="${p.lessonTitle.replace(/"/g, "'")}">\n${p.context || "(no lesson text provided)"}\n</lesson>`];
  if (p.videoTitle) {
    parts.push(
      p.transcript
        ? `<video_transcript title="${p.videoTitle.replace(/"/g, "'")}">\n${p.transcript}\n</video_transcript>`
        : `<video title="${p.videoTitle.replace(/"/g, "'")}">No transcript was provided for this video.</video>`,
    );
  }
  return parts.join("\n\n");
}

export const LEARNER =
  "The learner is studying robotics fundamentals to do self-model / world-model research. Their running example is a compliant pendulum: a motor drives angle θm, a torsional spring k connects it to an arm of mass m at length L with damping c (I = mL², ω_n = √((k + mgL)/I)). They learn by doing and want to be able to defend their understanding in research conversations.";

export function errorResponse(err: unknown): Response {
  if (err instanceof Anthropic.AuthenticationError) return Response.json({ error: "The API key was rejected. Check ANTHROPIC_API_KEY." }, { status: 502 });
  if (err instanceof Anthropic.RateLimitError) return Response.json({ error: "Rate limited by the API. Wait a moment and try again." }, { status: 429 });
  if (err instanceof Anthropic.BadRequestError) return Response.json({ error: `The API rejected the request: ${err.message}` }, { status: 502 });
  if (err instanceof Anthropic.APIError) return Response.json({ error: `API error ${err.status}: ${err.message}` }, { status: 502 });
  if (err instanceof Anthropic.APIConnectionError) return Response.json({ error: "Couldn't reach the Claude API." }, { status: 502 });
  console.error(err);
  return Response.json({ error: "Something went wrong on the server." }, { status: 500 });
}
