"use client";
import Link from "next/link";
import { useAiStatus } from "@/lib/ai-client";
import { lp, testResults } from "@/lib/progress";
import { useAppState } from "@/lib/store";
import { useItemCtx } from "../ItemContext";

/** In the lesson: a card that opens the test on its own page (/test/...). */
function TestCard({ id, kind, count }: { id: string; kind: "video" | "lesson"; count: number }) {
  const { meta } = useItemCtx();
  const [state] = useAppState();
  const status = useAiStatus();
  const p = lp(state, meta.id);
  const test = p.videoTests?.[id];
  const right = test ? testResults(test).filter((r) => r === true).length : 0;
  const passed = !!test?.passed || (!!p.items[id] && status?.enabled === false);
  const href = `/test/${meta.id}/${id}`;
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${passed ? "border-good/60 bg-good/10" : "border-white/15 bg-white/[0.04]"}`}>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-ink-100">{kind === "lesson" ? "Lesson test" : "Video test"}</p>
        <p className="text-sm text-ink-300">
          {passed
            ? `Passed, all ${test?.questions.length ?? count} right.`
            : test
              ? `${right} of ${test.questions.length} problems right so far.`
              : kind === "lesson"
                ? `${count} problems on the whole lesson. Get all of them right to pass.`
                : `${count} problems on this video. Get all of them right to complete it.`}
        </p>
      </div>
      <Link href={href} className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-ink-900 hover:brightness-110">
        {passed ? "Review" : test ? "Continue test →" : "Start test →"}
      </Link>
    </div>
  );
}

export function VideoTest({ id }: { id: string; title?: string; youtube?: string }) {
  return (
    <div className="mt-10">
      <TestCard id={id} kind="video" count={5} />
    </div>
  );
}

/** <Test id="test" title="Lesson test" />: the end-of-lesson test. */
export function LessonTest({ id }: { id: string; title?: string }) {
  const { activeItem } = useItemCtx();
  if (activeItem !== id) return null;
  return <TestCard id={id} kind="lesson" count={4} />;
}
