import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://reeltv.app";

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  // Dynamic channel pages
  const channels = await prisma.channel.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const channelPages = channels.map((ch: { slug: string; updatedAt: Date }) => ({
    url: `${baseUrl}/channel/${ch.slug}`,
    lastModified: ch.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...channelPages];
}
