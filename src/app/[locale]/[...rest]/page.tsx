import { notFound } from "next/navigation";

// Sends unknown localized paths to app/[locale]/not-found.tsx.
export default function CatchAllPage() {
  notFound();
}
