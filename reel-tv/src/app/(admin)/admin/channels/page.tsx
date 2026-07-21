"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Users, TrendingUp } from "lucide-react";

const CHANNELS = [
  { id: "1", name: "Fitness TV", slug: "fitness-tv", subscribers: 1234, videos: 56, active: true },
  { id: "2", name: "AI TV", slug: "ai-tv", subscribers: 5678, videos: 89, active: true },
  { id: "3", name: "Gaming TV", slug: "gaming-tv", subscribers: 9012, videos: 123, active: true },
];

export default function AdminChannelsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Channel Management</h1>
          <p className="text-muted-foreground">Manage all channels on the platform</p>
        </div>
        <Button className="gap-2 bg-reel hover:bg-reel/90">
          <Radio className="h-4 w-4" />
          Create Channel
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">All Channels ({CHANNELS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {CHANNELS.map((channel) => (
              <div key={channel.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-reel/10">
                  <Radio className="h-6 w-6 text-reel" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{channel.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{channel.subscribers.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{channel.videos} videos</span>
                  </div>
                </div>
                <Badge variant={channel.active ? "default" : "secondary"}>
                  {channel.active ? "Active" : "Inactive"}
                </Badge>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
