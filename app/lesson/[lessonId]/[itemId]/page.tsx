import { compileMDX } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { BuildPanel } from "@/components/BuildPanel";
import { LessonStage } from "@/components/LessonStage";
import { Callout, ProjectLink } from "@/components/mdx/Callout";
import { Milestone, Milestones, Paper } from "@/components/mdx/Capstone";
import { Article, BuildItem, Choice, Q, Quiz, Read, Solution, Watch } from "@/components/mdx/Items";
import { lessonPlainText, loadIndex, readBuildFiles, readLessonSource } from "@/lib/lessons";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadIndex().lessons.flatMap((l) => l.items.map((it) => ({ lessonId: l.id, itemId: it.id })));
}

export default async function ItemPage({ params }: { params: { lessonId: string; itemId: string } }) {
  const index = loadIndex();
  const meta = index.lessons.find((l) => l.id === params.lessonId);
  const source = readLessonSource(params.lessonId);
  if (!meta || !source || !meta.items.some((i) => i.id === params.itemId)) notFound();
  const unit = index.units.find((u) => u.topic === meta.topic)!;
  const files = readBuildFiles(meta.id);

  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
      // next-mdx-remote 6 strips all JS expressions by default. Lesson files are our own
      // and use simple literal props (minutes={10}, start={90}), so allow expressions but
      // keep the "dangerous JS" filter (no eval, imports, globals) switched on.
      blockJS: false,
      blockDangerousJS: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: "ignore" }]],
      },
    },
    components: {
      Article,
      Watch,
      Read,
      Quiz,
      Q,
      Choice,
      Solution,
      Callout,
      ProjectLink,
      Milestones,
      Milestone,
      Paper,
      Build: (props: { id: string; title: string; draft?: boolean; children?: React.ReactNode }) => (
        <BuildItem {...props} panel={<BuildPanel lessonId={meta.id} files={files} />} />
      ),
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
        props.href?.startsWith("http") ? <a {...props} target="_blank" rel="noopener noreferrer" /> : <a {...props} />,
    },
  });

  return (
    <LessonStage meta={meta} unit={unit} activeItem={params.itemId} context={lessonPlainText(meta.id)}>
      {content}
    </LessonStage>
  );
}
