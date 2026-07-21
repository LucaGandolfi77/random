"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Users, TrendingUp } from "lucide-react";

const CHANNELS = [
  { id: "1", name: "Fitness TV", subscribers: 1234, videos: 56, active: true },
  { id: "2", name: "AI TV", subscribers: 5678, videos: 89, active: true },
  { id: "3", name: "Gaming TV", subscribers: 9012, videos: 123, active: true },
];

export function ChannelManager() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Radio className="h-4 w-4 text-reel" />
          <h3 className="font-medium">Channels</h3>
        </div>
        <div className="space-y-2">
          {CHANNELS.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3 rounded border border-border/50 p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-reel/10">
                <Radio className="h-4 w-4 text-reel" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{ch.name}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ch.subscribers}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{ch.videos}</span>
                </div>
              </div>
              <Badge variant={ch.active ? "default" : "secondary"} className="text-xs">
                {ch.active ? "Active" : "Off"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
