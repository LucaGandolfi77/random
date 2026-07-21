import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    const schedules = await prisma.schedule.findMany({
      where: channelId ? { channelId } : {},
      include: {
        video: { select: { id: true, title: true, thumbnailUrl: true, duration: true } },
        channel: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ schedules });
  } catch {
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, videoId, broadcastOrderId, scheduledAt } = body;

    if (!channelId || !videoId || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const schedule = await prisma.schedule.create({
      data: { channelId, videoId, broadcastOrderId, scheduledAt: new Date(scheduledAt) },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}
