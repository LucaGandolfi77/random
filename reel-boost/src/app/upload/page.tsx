import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UploadForm } from "./UploadForm";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold">Upload a reel</h1>
        <p className="mt-1 text-white/60">
          Paste a direct MP4 link or a YouTube URL. Pick a category so it can be recommended to the right viewers.
        </p>
        <UploadForm categories={categories} />
      </main>
    </div>
  );
}