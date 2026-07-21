"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { motion } from "motion/react";
import { Eye, Heart, MessageCircle, Clock } from "lucide-react";
import { formatNumber, timeAgo, formatDuration } from "@/lib/utils";
import type { VideoWithDetails } from "@/types";

interface VideoCardProps {
  video: VideoWithDetails;
}

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link href={`/watch/${video.id}`}>
      <Card className="group cursor-pointer overflow-hidden border-border/50 bg-card/50 transition-all hover:border-reel/30 hover:bg-card">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-reel/20 to-background">
              <span className="text-4xl">🎬</span>
            </div>
          )}

          {/* Duration badge */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
              <Clock className="h-3 w-3" />
              {formatDuration(video.duration)}
            </div>
          )}

          {/* Status badge */}
          {video.status !== "APPROVED" && video.status !== "ACTIVE" && (
            <div className="absolute left-2 top-2">
              <Badge variant={video.status === "REJECTED" ? "destructive" : "secondary"}>
                {video.status}
              </Badge>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <div className="h-12 w-12 rounded-full bg-reel/90 opacity-0 transition-all group-hover:scale-110 group-hover:opacity-100">
              <div className="flex h-full items-center justify-center text-white">▶</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <CardContent className="p-3">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={video.user.avatar ?? undefined} />
              <AvatarFallback className="bg-reel/10 text-xs text-reel">
                {video.user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-tight group-hover:text-reel">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground">{video.user.name}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(video._count.views)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {formatNumber(video._count.likes)}
                </span>
                <span>{timeAgo(video.createdAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
