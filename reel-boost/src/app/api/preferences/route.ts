import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { categoryIds } = (await req.json().catch(() => ({}))) as { categoryIds?: string[] };
  if (!Array.isArray(categoryIds)) {
    return NextResponse.json({ error: "categoryIds required" }, { status: 400 });
  }

  await prisma.userCategory.deleteMany({ where: { userId: user.id } });
  if (categoryIds.length) {
    await prisma.userCategory.createMany({
      data: categoryIds.map((categoryId) => ({ userId: user.id, categoryId })),
    });
  }

  return NextResponse.json({ ok: true, categoryIds });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const prefs = await prisma.userCategory.findMany({
    where: { userId: user.id },
    select: { categoryId: true },
  });
  return NextResponse.json({ categoryIds: prefs.map((p) => p.categoryId) });
}