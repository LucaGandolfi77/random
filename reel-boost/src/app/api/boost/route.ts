import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const BoostBody = z.object({
  videoId: z.string(),
  amount: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BoostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { videoId, amount } = parsed.data;

  const video = await prisma.video.findUnique({ where: { id: videoId }, select: { authorId: true } });
  if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  if (video.authorId !== user.id)
    return NextResponse.json({ error: "not_owner" }, { status: 403 });

  if (amount > user.walletBalance)
    return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { walletBalance: { decrement: amount } },
      select: { walletBalance: true },
    }),
    prisma.boost.create({ data: { userId: user.id, videoId, amount } }),
    prisma.walletTransaction.create({
      data: { userId: user.id, type: "BOOST_SPEND", amount, videoId },
    }),
  ]);

  return NextResponse.json({ ok: true, balance: updated.walletBalance, amount });
}