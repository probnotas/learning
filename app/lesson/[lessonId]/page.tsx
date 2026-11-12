import { notFound } from "next/navigation";
import { LessonRedirect } from "@/components/LessonStage";
import { listLessons } from "@/lib/lessons";

export const dynamicParams = false;

export function generateStaticParams() {
  return listLessons().map((l) => ({ lessonId: l.id }));
}

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  const meta = listLessons().find((l) => l.id === params.lessonId);
  if (!meta) notFound();
  return <LessonRedirect meta={meta} />;
}
