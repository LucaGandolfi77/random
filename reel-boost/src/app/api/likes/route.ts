import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { videoId } = (await req.json().catch(() => ({}))) as { videoId?: string };
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  const existing = await prisma.like.findUnique({
    where: { userId_videoId: { userId: user.id, videoId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.like.create({ data: { userId: user.id, videoId } });
  return NextResponse.json({ liked: true });
}