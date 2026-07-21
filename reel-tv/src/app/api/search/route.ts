import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "relevance";

    if (!q && !category) {
      const channels = await prisma.channel.findMany({
        where: { isActive: true },
        include: {
          category: true,
          owner: { select: { name: true, avatar: true } },
          _count: { select: { videos: true, subscriptions: true } },
        },
        orderBy: { subscriberCount: "desc" },
        take: 20,
      });
      return NextResponse.json({ channels, videos: [] });
    }

    const channelWhere: Record<string, unknown> = { isActive: true };
    if (q) channelWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
    if (category) channelWhere.category = { slug: category };

    const channels = await prisma.channel.findMany({
      where: channelWhere,
      include: {
        category: true,
        owner: { select: { name: true, avatar: true } },
        _count: { select: { videos: true, subscriptions: true } },
      },
      orderBy: sort === "trending" ? { subscriberCount: "desc" } : { createdAt: "desc" },
      take: 20,
    });

    const videoWhere: Record<string, unknown> = { status: { in: ["APPROVED", "ACTIVE"] } };
    if (q) videoWhere.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];

    const videos = await prisma.video.findMany({
      where: videoWhere,
      include: {
        user: { select: { name: true, avatar: true } },
        _count: { select: { likes: true, views: true, comments: true } },
      },
      orderBy: sort === "trending" ? { createdAt: "desc" } : { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ channels, videos });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
