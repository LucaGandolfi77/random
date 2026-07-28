import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rankFeed, buildFeedUser } from "@/lib/feed";
import { FeedView } from "@/components/FeedView";
import { Header } from "@/components/Header";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Feed · ReelBoost" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const categorySlug = sp.category;

  const category = categorySlug
    ? await prisma.category.findUnique({ where: { slug: categorySlug } })
    : null;

  const where = category ? { categoryId: category.id, active: true } : { active: true };

  const user = await getCurrentUser();

  const [videos, categories] = await Promise.all([
    prisma.video.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        thumbnailUrl: true,
        duration: true,
        sourceType: true,
        externalId: true,
        createdAt: true,
        authorId: true,
        categoryId: true,
        author: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { likes: true, views: true } },
        boosts: { select: { amount: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  let likedIds: string[] = [];
  let feedUser = buildFeedUser({ id: "anon", preferredCategoryIds: [], likes: [] });
  if (user) {
    const [prefs, likes] = await Promise.all([
      prisma.userCategory.findMany({ where: { userId: user.id }, select: { categoryId: true } }),
      prisma.like.findMany({
        where: { userId: user.id },
        select: {
          videoId: true,
          video: { select: { categoryId: true, authorId: true } },
        },
      }),
    ]);
    likedIds = likes.map((l) => l.videoId);
    feedUser = buildFeedUser({
      id: user.id,
      preferredCategoryIds: prefs.map((p) => p.categoryId),
      likes: likes.map((l) => ({ categoryId: l.video.categoryId, authorId: l.video.authorId })),
    });
  }

  const ranked = rankFeed(
    videos.map((v) => ({
      id: v.id,
      title: v.title,
      categoryId: v.categoryId,
      authorId: v.authorId,
      createdAt: v.createdAt.getTime(),
      boostTotal: v.boosts.reduce((s, b) => s + b.amount, 0),
      likeCount: v._count.likes,
      viewCount: v._count.views,
    })),
    feedUser,
    { now: Date.now() },
  );

  const rankedMap = new Map(ranked.map((r) => [r.video.id, r]));

  const items = ranked.map((r) => {
    const v = videos.find((x) => x.id === r.video.id)!;
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl,
      duration: v.duration,
      sourceType: v.sourceType,
      externalId: v.externalId,
      createdAt: v.createdAt.toISOString(),
      authorId: v.authorId,
      categoryId: v.categoryId,
      author: v.author,
      category: v.category,
      _count: v._count,
      boosted: r.boosted,
      boostTotal: r.video.boostTotal,
      score: r.score,
    };
  });

  return (
    <div className="min-h-[100dvh]">
      <Header />
      <div className="sticky top-14 z-40 flex gap-2 overflow-x-auto border-b border-white/10 bg-black/80 px-3 py-2 no-scrollbar">
        <Link
          href="/"
          className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
            !categorySlug ? "bg-white text-black" : "bg-white/10 text-white"
          }`}
        >
          For you
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/?category=${c.slug}`}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              categorySlug === c.slug ? "bg-white text-black" : "bg-white/10 text-white"
            }`}
          >
            {c.icon ? `${c.icon} ` : ""}{c.name}
          </Link>
        ))}
      </div>

      <FeedView initialItems={items} userLikedIds={likedIds} />
    </div>
  );
}