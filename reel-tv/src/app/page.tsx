import { Hero } from "@/components/home/Hero";
import { ChannelCarousel } from "@/components/home/ChannelCarousel";
import { TrendingSection } from "@/components/home/TrendingSection";
import { FeaturedCreators } from "@/components/home/FeaturedCreators";
import { StatsSection } from "@/components/home/StatsSection";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { prisma } from "@/lib/prisma";

async function getHomeData() {
  try {
    const [channels, featuredChannels, videos, creators] = await Promise.all([
      prisma.channel.findMany({
        where: { isActive: true },
        include: {
          category: true,
          owner: { select: { name: true, avatar: true } },
          _count: { select: { videos: true, subscriptions: true } },
        },
        orderBy: { subscriberCount: "desc" },
        take: 12,
      }),
      prisma.channel.findMany({
        where: { isActive: true, isFeatured: true },
        include: {
          category: true,
          owner: { select: { name: true, avatar: true } },
          _count: { select: { videos: true, subscriptions: true } },
        },
        take: 6,
      }),
      prisma.video.findMany({
        where: { status: { in: ["APPROVED", "ACTIVE"] } },
        include: {
          user: { select: { name: true, avatar: true } },
          _count: { select: { likes: true, views: true, comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.user.findMany({
        where: { role: "CREATOR" },
        select: {
          id: true,
          name: true,
          avatar: true,
          _count: { select: { channels: true } },
        },
        take: 8,
      }),
    ]);

    return { channels, featuredChannels, videos, creators };
  } catch {
    return { channels: [], featuredChannels: [], videos: [], creators: [] };
  }
}

export default async function HomePage() {
  const { channels, featuredChannels, videos, creators } = await getHomeData();

  const mappedCreators = creators.map((c: { id: string; name: string | null; avatar: string | null; _count: { channels: number } }) => ({
    id: c.id,
    name: c.name ?? "Unknown",
    avatar: c.avatar,
    channelCount: c._count.channels,
    subscriberCount: 0,
  }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <Hero />

        {featuredChannels.length > 0 && (
          <ChannelCarousel
            title="Featured Channels"
            channels={featuredChannels}
            seeAllHref="/search"
          />
        )}

        {videos.length > 0 && <TrendingSection videos={videos} />}

        {channels.length > 0 && (
          <ChannelCarousel
            title="Top Channels"
            channels={channels}
            seeAllHref="/search"
          />
        )}

        {mappedCreators.length > 0 && <FeaturedCreators creators={mappedCreators} />}

        <StatsSection />

        {/* CTA Section */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Ready to <span className="text-gradient">Broadcast</span>?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join thousands of creators already broadcasting on REELTV.
              Buy airtime, reach your audience, grow your brand.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a href="/sign-up">
                <button className="rounded-lg bg-reel px-8 py-3 font-semibold text-white transition-colors hover:bg-reel/90">
                  Start for Free
                </button>
              </a>
              <a href="/pricing">
                <button className="rounded-lg border border-border px-8 py-3 font-semibold transition-colors hover:bg-muted">
                  View Pricing
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
