import { compileMDX } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { BuildPanel } from "@/components/BuildPanel";
import { ItemPlayer } from "@/components/ItemPlayer";
import { Callout, ProjectLink } from "@/components/mdx/Callout";
import { Article, BuildItem, Choice, Q, Quiz, Read, Solution, Watch } from "@/components/mdx/Items";
import { loadIndex, readBuildFiles, readLessonSource } from "@/lib/lessons";

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
      Build: (props: { id: string; title: string; draft?: boolean; children?: React.ReactNode }) => (
        <BuildItem {...props} panel={<BuildPanel lessonId={meta.id} files={files} />} />
      ),
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
        props.href?.startsWith("http") ? <a {...props} target="_blank" rel="noopener noreferrer" /> : <a {...props} />,
    },
  });

  return (
    <ItemPlayer meta={meta} unit={unit} activeItem={params.itemId}>
      {content}
    </ItemPlayer>
  );
}
