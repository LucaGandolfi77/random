import { prisma } from "@/lib/prisma";
import type { BroadcastPackage } from "@/generated/prisma/enums";

const PACKAGE_WEIGHTS: Record<BroadcastPackage, number> = {
  STARTER: 1,
  STANDARD: 2,
  PRO: 3,
  BUSINESS: 4,
};

/**
 * Core scheduling algorithm.
 * Selects the next video to broadcast on a channel based on:
 * 1. Package tier weight (higher = more likely)
 * 2. No immediate repetition
 * 3. Fair exposure across creators
 */
export async function getNextVideo(channelId: string): Promise<string | null> {
  // Get all active broadcast orders for this channel
  const orders = await prisma.broadcastOrder.findMany({
    where: {
      channelId,
      status: "ACTIVE",
      broadcastsRemaining: { gt: 0 },
    },
    include: {
      video: { select: { id: true } },
    },
  });

  if (orders.length === 0) return null;

  // Get the last broadcast video for this channel
  const lastSchedule = await prisma.schedule.findFirst({
    where: { channelId },
    orderBy: { scheduledAt: "desc" },
    select: { videoId: true },
  });

  const lastVideoId = lastSchedule?.videoId;

  // Filter out the last played video (no immediate repetition)
  const eligible = lastVideoId
    ? orders.filter((o: (typeof orders)[number]) => o.videoId !== lastVideoId)
    : orders;

  if (eligible.length === 0) {
    // If all orders are the same video, allow repetition
    return orders[0]?.videoId ?? null;
  }

  // Weighted random selection
  const totalWeight = eligible.reduce(
    (sum: number, order: (typeof eligible)[number]) => sum + PACKAGE_WEIGHTS[order.package as BroadcastPackage],
    0,
  );

  let random = Math.random() * totalWeight;
  for (const order of eligible) {
    random -= PACKAGE_WEIGHTS[order.package];
    if (random <= 0) {
      // Decrement broadcast count
      await prisma.broadcastOrder.update({
        where: { id: order.id },
        data: { broadcastsRemaining: { decrement: 1 } },
      });

      // Check if order is completed
      if (order.broadcastsRemaining <= 1) {
        await prisma.broadcastOrder.update({
          where: { id: order.id },
          data: { status: "COMPLETED" },
        });
      }

      return order.videoId;
    }
  }

  return eligible[0]?.videoId ?? null;
}

/**
 * Generate the schedule for the next N hours on a channel.
 */
export async function generateSchedule(channelId: string, hours: number = 24) {
  const now = new Date();
  const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const schedules: Array<{
    channelId: string;
    videoId: string;
    broadcastOrderId: string | null;
    scheduledAt: Date;
  }> = [];

  let currentTime = now;

  while (currentTime < endTime) {
    const videoId = await getNextVideo(channelId);
    if (!videoId) break;

    // Find the order for this video
    const order = await prisma.broadcastOrder.findFirst({
      where: {
        channelId,
        videoId,
        status: "ACTIVE",
      },
    });

    schedules.push({
      channelId,
      videoId,
      broadcastOrderId: order?.id ?? null,
      scheduledAt: new Date(currentTime),
    });

    // Each slot is 60 seconds
    currentTime = new Date(currentTime.getTime() + 60 * 1000);
  }

  // Bulk insert schedules
  if (schedules.length > 0) {
    await prisma.schedule.createMany({ data: schedules });
  }

  return schedules;
}
