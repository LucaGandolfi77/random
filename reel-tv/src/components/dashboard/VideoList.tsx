"use client";

import { Badge } from "@/components/ui/badge";
import { Eye, Heart, Clock } from "lucide-react";
import { formatNumber, formatDuration } from "@/lib/utils";

const demoVideos = [
  {
    id: "1",
    title: "10 Minute HIIT Workout",
    status: "ACTIVE" as const,
    views: 12500,
    likes: 890,
    duration: 600,
  },
  {
    id: "2",
    title: "Startup Funding Tips",
    status: "APPROVED" as const,
    views: 8200,
    likes: 456,
    duration: 900,
  },
  {
    id: "3",
    title: "AI News This Week",
    status: "PENDING" as const,
    views: 0,
    likes: 0,
    duration: 480,
  },
];

const statusColors = {
  ACTIVE: "bg-green-500/10 text-green-500",
  APPROVED: "bg-blue-500/10 text-blue-500",
  PENDING: "bg-yellow-500/10 text-yellow-500",
  REJECTED: "bg-red-500/10 text-red-500",
  UPLOADING: "bg-purple-500/10 text-purple-500",
  PROCESSING: "bg-orange-500/10 text-orange-500",
  ARCHIVED: "bg-gray-500/10 text-gray-500",
};

export function VideoList() {
  return (
    <div className="space-y-3">
      {demoVideos.map((video) => (
        <div
          key={video.id}
          className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-lg">
            🎬
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-medium">{video.title}</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatNumber(video.views)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {formatNumber(video.likes)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(video.duration)}
              </span>
            </div>
          </div>
          <Badge className={statusColors[video.status]} variant="secondary">
            {video.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
