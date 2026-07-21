import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (videoId) {
      const analytics = await prisma.videoAnalytics.findMany({
        where: { videoId, date: { gte: startDate } },
        orderBy: { date: "asc" },
      });
      return NextResponse.json({ analytics });
    }

    const totalViews = await prisma.view.count({ where: { createdAt: { gte: startDate } } });
    const totalLikes = await prisma.like.count({ where: { createdAt: { gte: startDate } } });

    return NextResponse.json({ totalViews, totalLikes, period: `${days} days` });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
