import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const { videoId, watchTime, completed } = (await req.json().catch(() => ({}))) as {
    videoId?: string;
    watchTime?: number;
    completed?: boolean;
  };
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  await prisma.view.create({
    data: {
      videoId,
      userId: user?.id ?? null,
      watchTime: watchTime ?? 0,
      completed: completed ?? false,
    },
  });

  return NextResponse.json({ ok: true });
}