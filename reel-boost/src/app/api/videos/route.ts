import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const CreateBody = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().int().positive().optional(),
  sourceType: z.enum(["DEMO", "UPLOAD", "YOUTUBE"]).default("UPLOAD"),
  externalId: z.string().optional(),
  categoryId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const b = parsed.data;

  const video = await prisma.video.create({
    data: {
      title: b.title,
      description: b.description,
      url: b.url,
      thumbnailUrl: b.thumbnailUrl,
      duration: b.duration,
      sourceType: b.sourceType,
      externalId: b.externalId,
      authorId: user.id,
      categoryId: b.categoryId,
      active: true,
    },
  });

  return NextResponse.json({ ok: true, video });
}

export async function GET() {
  const videos = await prisma.video.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      thumbnailUrl: true,
      duration: true,
      sourceType: true,
      externalId: true,
      createdAt: true,
      author: { select: { id: true, name: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { likes: true, views: true } },
    },
  });
  return NextResponse.json({ items: videos });
}