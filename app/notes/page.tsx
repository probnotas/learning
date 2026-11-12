import { TopBar } from "@/components/Chrome";
import { NotesView } from "@/components/NotesView";
export default function NotesPage() {
  return (
    <>
      <TopBar title="Notebook" />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <NotesView />
    </div>
    </>
  );
}
