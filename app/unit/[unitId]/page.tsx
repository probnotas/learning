import { notFound } from "next/navigation";
import { CoursePage } from "@/components/CoursePage";
import { loadIndex } from "@/lib/lessons";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadIndex().units.map((u) => ({ unitId: u.topic.toLowerCase() }));
}

export default function UnitPage({ params }: { params: { unitId: string } }) {
  const unit = loadIndex().units.find((u) => u.topic.toLowerCase() === params.unitId.toLowerCase());
  if (!unit) notFound();
  return <CoursePage unitTopic={unit.topic} />;
}
