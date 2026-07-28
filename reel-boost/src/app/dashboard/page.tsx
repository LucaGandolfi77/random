import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VideoCard } from "./VideoCard";
import { formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const videos = await prisma.video.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      url: true,
      thumbnailUrl: true,
      sourceType: true,
      createdAt: true,
      category: { select: { name: true, slug: true } },
      boosts: { select: { amount: true } },
      _count: { select: { likes: true, views: true } },
    },
  });

  const totals = videos.reduce(
    (acc, v) => {
      acc.views += v._count.views;
      acc.likes += v._count.likes;
      acc.boost += v.boosts.reduce((s, b) => s + b.amount, 0);
      return acc;
    },
    { views: 0, likes: 0, boost: 0 },
  );

  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Creator dashboard</h1>
          <a
            href="/upload"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            + Upload
          </a>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Reels" value={String(videos.length)} />
          <Stat label="Views" value={formatNumber(totals.views)} />
          <Stat label="Likes" value={formatNumber(totals.likes)} />
          <Stat label="Boost spent" value={`🚀 ${formatNumber(totals.boost)}`} />
        </div>

        <h2 className="mt-8 text-lg font-semibold">Your reels</h2>
        <div className="mt-4 space-y-4">
          {videos.length === 0 && (
            <p className="text-white/50">
              You haven&apos;t published any reels yet.{" "}
              <a href="/upload" className="text-fuchsia-400">
                Upload your first
              </a>
              .
            </p>
          )}
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              url={v.url}
              thumbnailUrl={v.thumbnailUrl}
              sourceType={v.sourceType}
              createdAt={v.createdAt}
              categoryName={v.category?.name ?? null}
              likes={v._count.likes}
              views={v._count.views}
              boostTotal={v.boosts.reduce((s, b) => s + b.amount, 0)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}