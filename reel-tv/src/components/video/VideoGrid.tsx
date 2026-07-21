"use client";

import { VideoCard } from "@/components/video/VideoCard";
import type { VideoWithDetails } from "@/types";

interface VideoGridProps {
  videos: VideoWithDetails[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
