import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rankFeed, buildFeedUser, type FeedVideo } from "@/lib/feed";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("category") || undefined;
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));

  const user = await getCurrentUser();

  const where = categoryId ? { categoryId, active: true } : { active: true };

  const videos = await prisma.video.findMany({
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
      categoryId: true,
      authorId: true,
      author: { select: { id: true, name: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { likes: true, views: true } },
      boosts: { select: { amount: true } },
    },
  });

  let feedUser;
  if (user) {
    const [prefs, likes] = await Promise.all([
      prisma.userCategory.findMany({ where: { userId: user.id }, select: { categoryId: true } }),
      prisma.like.findMany({
        where: { userId: user.id },
        select: { video: { select: { categoryId: true, authorId: true } } },
      }),
    ]);
    feedUser = buildFeedUser({
      id: user.id,
      preferredCategoryIds: prefs.map((p) => p.categoryId),
      likes: likes.map((l) => ({ categoryId: l.video.categoryId, authorId: l.video.authorId })),
    });
  } else {
    feedUser = buildFeedUser({ id: "anon", preferredCategoryIds: [], likes: [] });
  }

  const feedVideos: FeedVideo[] = videos.map((v) => ({
    id: v.id,
    title: v.title,
    categoryId: v.categoryId,
    authorId: v.authorId,
    createdAt: v.createdAt.getTime(),
    boostTotal: v.boosts.reduce((s, b) => s + b.amount, 0),
    likeCount: v._count.likes,
    viewCount: v._count.views,
  }));

  const ranked = rankFeed(feedVideos, feedUser, { now: Date.now() }).slice(0, limit);

  const videoMap = new Map(videos.map((v) => [v.id, v]));
  const result = ranked.map((s) => ({
    ...videoMap.get(s.video.id)!,
    score: Number(s.score.toFixed(4)),
    boostTotal: s.video.boostTotal,
    boosted: s.boosted,
    components: s.components,
  }));

  return NextResponse.json({ items: result, user });
}