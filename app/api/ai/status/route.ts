import { aiConfigured } from "@/lib/ai-server";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ enabled: aiConfigured(), needsCode: !!process.env.LEARNLAB_ACCESS_CODE });
}
