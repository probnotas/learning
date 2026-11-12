import { TopBar } from "@/components/Chrome";
import { TranscriptImport } from "@/components/ai/TranscriptImport";
export default function TranscriptsPage() {
  return (
    <>
      <TopBar title="Transcripts" />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <TranscriptImport />
      </div>
    </>
  );
}
