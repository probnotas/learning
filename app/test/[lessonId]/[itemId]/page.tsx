import { notFound } from "next/navigation";
import { TestRunner } from "@/components/ai/TestRunner";
import { lessonPlainText, loadIndex } from "@/lib/lessons";

export const dynamicParams = false;

const isTest = (kind: string) => kind === "video" || kind === "test";

export function generateStaticParams() {
  return loadIndex().lessons.flatMap((l) => l.items.filter((it) => isTest(it.kind)).map((it) => ({ lessonId: l.id, itemId: it.id })));
}

/** The after-video test and the end-of-lesson test, on their own page, one problem at a time. */
export default function TestPage({ params }: { params: { lessonId: string; itemId: string } }) {
  const index = loadIndex();
  const meta = index.lessons.find((l) => l.id === params.lessonId);
  const at = meta?.items.findIndex((i) => i.id === params.itemId) ?? -1;
  if (!meta || at < 0 || !isTest(meta.items[at].kind)) notFound();
  const next = meta.items[at + 1];
  return (
    <TestRunner
      lessonId={meta.id}
      itemId={params.itemId}
      context={lessonPlainText(meta.id)}
      backHref={`/lesson/${meta.id}/${params.itemId}`}
      nextHref={next ? `/lesson/${meta.id}/${next.id}` : `/unit/${meta.topic.toLowerCase()}`}
    />
  );
}
