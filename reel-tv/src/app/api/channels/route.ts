import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? String(ITEMS_PER_PAGE));
    const categoryId = searchParams.get("categoryId");
    const featured = searchParams.get("featured") === "true";
    const sort = searchParams.get("sort") ?? "popular";

    const where: Record<string, unknown> = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (featured) where.isFeatured = true;

    const orderBy =
      sort === "newest"
        ? { createdAt: "desc" as const }
        : sort === "name"
          ? { name: "asc" as const }
          : { subscriberCount: "desc" as const };

    const [channels, total] = await Promise.all([
      prisma.channel.findMany({
        where,
        include: {
          category: true,
          owner: { select: { name: true, avatar: true } },
          _count: { select: { videos: true, subscriptions: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.channel.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: channels,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch channels" },
      { status: 500 },
    );
  }
}
