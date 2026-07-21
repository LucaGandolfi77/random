"use client";

import { VideoCard } from "@/components/video/VideoCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Flame } from "lucide-react";
import type { VideoWithDetails } from "@/types";

interface TrendingSectionProps {
  videos: VideoWithDetails[];
}

export function TrendingSection({ videos }: TrendingSectionProps) {
  return (
    <section className="py-6">
      <div className="mb-4 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-bold">Trending Now</h2>
        </div>
        <Link href="/search?sort=trending">
          <Button variant="ghost" size="sm">
            See All
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.slice(0, 8).map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}
