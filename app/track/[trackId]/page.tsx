import { notFound } from "next/navigation";
import { TrackView } from "@/components/TrackView";
import { loadCurriculum } from "@/lib/curriculum";

export default function TrackPage({ params }: { params: { trackId: string } }) {
  const curriculum = loadCurriculum();
  const track = curriculum.tracks.find((t) => t.id.toLowerCase() === params.trackId.toLowerCase());
  if (!track) notFound();
  return <TrackView trackId={track.id} />;
}
