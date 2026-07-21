"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface PlayerProps {
  video: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    duration: number | null;
  } | null;
  channelName: string;
}

export function Player({ video, channelName }: PlayerProps) {
  if (!video) {
    return (
      <Card className="aspect-video flex flex-col items-center justify-center border-border/50 bg-card/50">
        <div className="text-6xl">📺</div>
        <p className="mt-4 text-muted-foreground">No videos scheduled yet</p>
        <p className="text-sm text-muted-foreground">
          Be the first to broadcast on {channelName}!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <Card className="aspect-video overflow-hidden border-border/50 bg-black">
        {video.thumbnailUrl ? (
          <div className="relative h-full w-full">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Button size="lg" className="h-16 w-16 rounded-full bg-reel/90 hover:bg-reel">
                ▶
              </Button>
            </div>
            {video.duration && (
              <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs text-white">
                {formatDuration(video.duration)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-6xl">🎬</span>
          </div>
        )}
      </Card>

      {/* Video Info */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{video.title}</h2>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2">
            <ThumbsUp className="h-4 w-4" />
            Like
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Heart className="h-4 w-4" />
            Save
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
