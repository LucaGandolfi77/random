import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const Topup = z.object({ amount: z.number().int().min(1).max(100000) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Topup.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });

  const amount = parsed.data.amount;
  const [updated, tx] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { walletBalance: { increment: amount } },
      select: { walletBalance: true },
    }),
    prisma.walletTransaction.create({
      data: { userId: user.id, type: "TOPUP", amount },
    }),
  ]);

  return NextResponse.json({ ok: true, balance: updated.walletBalance, transaction: tx });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [transactions, full] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } }),
  ]);

  return NextResponse.json({ balance: full?.walletBalance ?? 0, transactions });
}