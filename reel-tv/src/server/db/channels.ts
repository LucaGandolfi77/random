import { prisma } from "@/lib/prisma";

export async function getChannelBySlug(slug: string) {
  return prisma.channel.findUnique({
    where: { slug },
    include: {
      category: true,
      owner: { select: { id: true, name: true, avatar: true } },
      _count: { select: { videos: true, subscriptions: true } },
    },
  });
}

export async function getChannels(options: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  featured?: boolean;
  sort?: "newest" | "popular" | "name";
}) {
  const { page = 1, pageSize = 20, categoryId, featured, sort = "popular" } = options;

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

  return { channels, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createChannel(data: {
  name: string;
  slug: string;
  description?: string;
  categoryId?: string;
  ownerId: string;
}) {
  return prisma.channel.create({ data });
}

export async function updateChannel(
  id: string,
  data: Partial<{ name: string; description: string; categoryId: string; logo: string; banner: string }>,
) {
  return prisma.channel.update({ where: { id }, data });
}
