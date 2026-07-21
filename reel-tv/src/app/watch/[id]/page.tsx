import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";

async function getVideo(id: string) {
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      tags: true,
      _count: { select: { likes: true, views: true, comments: true } },
    },
  });

  if (!video) notFound();
  return video;
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 md:pb-6">
        <VideoPlayer video={video} />
      </main>
      <MobileNav />
    </div>
  );
}
