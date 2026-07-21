import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChannelHeader } from "@/components/channel/ChannelHeader";
import { Player } from "@/components/channel/Player";
import { TVGuide } from "@/components/channel/TVGuide";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";

async function getChannel(slug: string) {
  const channel = await prisma.channel.findUnique({
    where: { slug },
    include: {
      category: true,
      owner: { select: { id: true, name: true, avatar: true } },
      videos: {
        where: { status: { in: ["APPROVED", "ACTIVE"] } },
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      schedules: {
        where: { scheduledAt: { gte: new Date() } },
        take: 10,
        orderBy: { scheduledAt: "asc" },
        include: {
          video: { select: { id: true, title: true, thumbnailUrl: true, duration: true } },
        },
      },
      _count: { select: { subscriptions: true, videos: true } },
    },
  });

  if (!channel) notFound();
  return channel;
}

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = await getChannel(slug);

  const currentVideo = channel.schedules.find((s: { isActive: boolean; video: unknown }) => s.isActive)?.video ?? channel.videos[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <ChannelHeader channel={channel} subscriberCount={channel._count.subscriptions} />

        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Player video={currentVideo} channelName={channel.name} />
            </div>
            <div>
              <TVGuide
                schedules={channel.schedules}
                channelName={channel.name}
              />
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
