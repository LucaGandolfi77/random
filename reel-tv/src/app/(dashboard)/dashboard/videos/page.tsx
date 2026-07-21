"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Upload, Eye, Clock, MoreVertical } from "lucide-react";

const DEMO_VIDEOS = [
  { id: "1", title: "My Fitness Reel", status: "ACTIVE", views: 1234, duration: 60, createdAt: new Date("2025-01-15") },
  { id: "2", title: "Morning Workout", status: "PENDING", views: 0, duration: 45, createdAt: new Date("2025-01-14") },
  { id: "3", title: "Healthy Recipes", status: "APPROVED", views: 567, duration: 90, createdAt: new Date("2025-01-13") },
];

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-500",
  PENDING: "bg-yellow-500/10 text-yellow-500",
  APPROVED: "bg-blue-500/10 text-blue-500",
  REJECTED: "bg-red-500/10 text-red-500",
};

export default function DashboardVideosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Videos</h1>
          <p className="text-muted-foreground">Manage your uploaded videos</p>
        </div>
        <Button className="gap-2 bg-reel hover:bg-reel/90">
          <Upload className="h-4 w-4" />
          Upload New
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Videos ({DEMO_VIDEOS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEMO_VIDEOS.map((video) => (
              <div key={video.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-16 w-24 items-center justify-center rounded bg-muted">
                  <Video className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-medium">{video.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {video.views.toLocaleString()} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {video.duration}s
                    </span>
                  </div>
                </div>
                <Badge className={statusColors[video.status] ?? ""}>{video.status}</Badge>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
