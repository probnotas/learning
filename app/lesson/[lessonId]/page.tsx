import { compileMDX } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { BuildPanel } from "@/components/BuildPanel";
import { LessonShell } from "@/components/LessonShell";
import { Callout, ProjectLink } from "@/components/mdx/Callout";
import { NotDrafted } from "@/components/mdx/Draft";
import { Hint, Problem, Solution } from "@/components/mdx/Problem";
import { Read, Watch } from "@/components/mdx/Watch";
import { loadCurriculum } from "@/lib/curriculum";
import { listLessons, readBuildFiles, readLessonSource } from "@/lib/lessons";

export default async function LessonPage({ params }: { params: { lessonId: string } }) {
  const source = readLessonSource(params.lessonId);
  const meta = listLessons().find((l) => l.id === params.lessonId);
  if (!source || !meta) notFound();

  const curriculum = loadCurriculum();
  const track = curriculum.tracks.find((t) => t.id === meta.track);
  const topic = track?.topics.find((t) => t.id === meta.topic);
  const files = readBuildFiles(meta.id);

  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: "ignore" }]],
      },
    },
    components: {
      Watch,
      Read,
      Problem,
      Solution,
      Hint,
      Callout,
      ProjectLink,
      NotDrafted,
      Build: () => <BuildPanel lessonId={meta.id} files={files} />,
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
        props.href?.startsWith("http") ? <a {...props} target="_blank" rel="noopener noreferrer" /> : <a {...props} />,
    },
  });

  return (
    <LessonShell meta={meta} trackTitle={track?.title ?? meta.track} topicTitle={topic ? `${topic.id}. ${topic.title}` : meta.topic}>
      {content}
    </LessonShell>
  );
}
