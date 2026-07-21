"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { useRef } from "react";
import type { ChannelWithCategory } from "@/types";

interface ChannelCarouselProps {
  title: string;
  channels: ChannelWithCategory[];
  seeAllHref?: string;
}

export function ChannelCarousel({ title, channels, seeAllHref }: ChannelCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-6">
      <div className="mb-4 flex items-center justify-between px-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          {seeAllHref && (
            <Link href={seeAllHref}>
              <Button variant="ghost" size="sm">
                See All
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-thin flex gap-4 overflow-x-auto px-4 pb-2"
      >
        {channels.map((channel, i) => (
          <motion.div
            key={channel.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link href={`/channel/${channel.slug}`}>
              <Card className="group w-72 flex-shrink-0 cursor-pointer border-border/50 bg-card/50 transition-all hover:border-reel/50 hover:bg-card">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-reel/10 text-xl">
                      {channel.category?.icon ?? <Radio className="h-6 w-6 text-reel" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold group-hover:text-reel">{channel.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {channel.category?.name ?? "Channel"}
                      </p>
                    </div>
                  </div>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {channel.description ?? "No description"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{channel.subscriberCount.toLocaleString()} subscribers</span>
                    <span>{channel._count.videos} videos</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
