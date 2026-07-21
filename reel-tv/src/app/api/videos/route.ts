import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? String(ITEMS_PER_PAGE));
    const status = searchParams.get("status");
    const channelId = searchParams.get("channelId");
    const sort = searchParams.get("sort") ?? "newest";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (channelId) where.schedules = { some: { channelId } };

    const orderBy =
      sort === "popular"
        ? { views: { _count: "desc" as const } }
        : sort === "trending"
          ? { createdAt: "desc" as const }
          : { createdAt: "desc" as const };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        include: {
          user: { select: { name: true, avatar: true } },
          _count: { select: { likes: true, views: true, comments: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.video.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: videos,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 },
    );
  }
}
