import { TopBar } from "@/components/Chrome";
import { ProjectsView } from "@/components/ProjectsView";
export default function ProjectsPage() {
  return (
    <>
      <TopBar title="Projects" />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <ProjectsView />
    </div>
    </>
  );
}
