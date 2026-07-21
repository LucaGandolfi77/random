import { prisma } from "@/lib/prisma";

export async function getVideoById(id: string) {
  return prisma.video.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      _count: { select: { likes: true, views: true, comments: true } },
    },
  });
}

export async function getVideos(options: {
  page?: number;
  pageSize?: number;
  status?: string;
  channelId?: string;
  userId?: string;
  sort?: "newest" | "popular" | "trending";
}) {
  const { page = 1, pageSize = 20, status, channelId, userId, sort = "newest" } = options;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (channelId) where.schedules = { some: { channelId } };

  const orderBy =
    sort === "popular"
      ? { views: { _count: "desc" as const } }
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

  return { videos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createVideo(data: {
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  userId: string;
  status?: string;
}) {
  return prisma.video.create({
    data: {
      ...data,
      status: (data.status as "PENDING" | "APPROVED" | "ACTIVE") ?? "PENDING",
    },
  });
}

export async function updateVideoStatus(id: string, status: string) {
  return prisma.video.update({
    where: { id },
    data: { status: status as "PENDING" | "APPROVED" | "ACTIVE" | "REJECTED" },
  });
}
