"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, ThumbsUp, Eye, Clock } from "lucide-react";
import { formatNumber, timeAgo, formatDuration } from "@/lib/utils";

interface VideoPlayerProps {
  video: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    thumbnailUrl: string | null;
    duration: number | null;
    status: string;
    createdAt: Date;
    user: { id: string; name: string | null; avatar: string | null };
    tags: Array<{ name: string }>;
    _count: { likes: number; views: number; comments: number };
  };
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <div className="space-y-6">
      {/* Player */}
      <Card className="aspect-video overflow-hidden border-border/50 bg-black">
        {video.thumbnailUrl ? (
          <div className="relative h-full w-full">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Button size="lg" className="h-20 w-20 rounded-full bg-reel/90 text-xl hover:bg-reel">
                ▶
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-8xl">🎬</span>
          </div>
        )}
      </Card>

      {/* Info */}
      <div>
        <h1 className="mb-2 text-xl font-bold md:text-2xl">{video.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(video._count.views)} views
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {timeAgo(video.createdAt)}
          </span>
          {video.duration && (
            <span>{formatDuration(video.duration)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <ThumbsUp className="h-4 w-4" />
            {formatNumber(video._count.likes)}
          </Button>
          <Button variant="outline" className="gap-2">
            <Heart className="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {video._count.comments}
          </Button>
        </div>

        {/* Creator */}
        <div className="mt-6 flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={video.user.avatar ?? undefined} />
            <AvatarFallback className="bg-reel/10 text-reel">
              {video.user.name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{video.user.name}</p>
            <p className="text-xs text-muted-foreground">Creator</p>
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm">{video.description}</p>
          </div>
        )}

        {/* Tags */}
        {video.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {video.tags.map((tag) => (
              <Badge key={tag.name} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Comments placeholder */}
      <Card className="border-border/50 bg-card/50">
        <div className="p-4">
          <h3 className="mb-4 font-semibold">Comments ({video._count.comments})</h3>
          <p className="py-8 text-center text-sm text-muted-foreground">
            Comments coming soon
          </p>
        </div>
      </Card>
    </div>
  );
}
