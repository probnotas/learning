import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-20 text-center font-sans">
      <h1 className="text-2xl text-ink-100">Not found</h1>
      <Link href="/" className="mt-4 inline-block text-accent underline">
        Back to dashboard
      </Link>
    </div>
  );
}
