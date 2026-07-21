"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Radio } from "lucide-react";

interface Schedule {
  id: string;
  scheduledAt: Date;
  isActive: boolean;
  video: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    duration: number | null;
  };
}

interface TVGuideProps {
  schedules: Schedule[];
  channelName: string;
}

export function TVGuide({ schedules, channelName }: TVGuideProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-reel" />
          TV Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {schedules.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No upcoming broadcasts
          </p>
        ) : (
          schedules.map((schedule) => {
            const time = new Date(schedule.scheduledAt);
            const isNow = schedule.isActive;

            return (
              <div
                key={schedule.id}
                className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                  isNow ? "bg-reel/10 border border-reel/20" : "hover:bg-muted/50"
                }`}
              >
                <div className="w-14 text-center">
                  <div className="text-sm font-medium">
                    {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{schedule.video.title}</p>
                  {schedule.video.duration && (
                    <p className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {Math.floor(schedule.video.duration / 60)}m
                    </p>
                  )}
                </div>
                {isNow && (
                  <Badge className="bg-reel text-white text-xs">
                    LIVE
                  </Badge>
                )}
              </div>
            );
          })
        )}

        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Next broadcast in{" "}
            <span className="font-medium text-reel">12:34</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
