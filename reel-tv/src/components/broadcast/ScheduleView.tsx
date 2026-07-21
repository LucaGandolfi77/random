"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Radio } from "lucide-react";

interface ScheduleSlot {
  id: string;
  time: string;
  title: string;
  channel: string;
  isLive: boolean;
  isPast: boolean;
}

const DEMO_SCHEDULE: ScheduleSlot[] = [
  { id: "1", time: "09:00", title: "Morning Workout", channel: "Fitness TV", isLive: true, isPast: false },
  { id: "2", time: "09:05", title: "HIIT Session", channel: "Fitness TV", isLive: false, isPast: false },
  { id: "3", time: "09:10", title: "Yoga Basics", channel: "Fitness TV", isLive: false, isPast: false },
  { id: "4", time: "08:55", title: "Stretching", channel: "Fitness TV", isLive: false, isPast: true },
];

export function ScheduleView() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-reel" />
          My Broadcast Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {DEMO_SCHEDULE.map((slot) => (
            <div
              key={slot.id}
              className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                slot.isLive
                  ? "border border-reel/30 bg-reel/5"
                  : slot.isPast
                    ? "opacity-50"
                    : "hover:bg-muted/50"
              }`}
            >
              <span className="w-14 text-sm font-mono">{slot.time}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{slot.title}</p>
                <p className="text-xs text-muted-foreground">{slot.channel}</p>
              </div>
              {slot.isLive && (
                <Badge className="bg-reel text-white text-xs">
                  <Radio className="mr-1 h-3 w-3" />
                  LIVE
                </Badge>
              )}
              {slot.isPast && <Badge variant="secondary" className="text-xs">Completed</Badge>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
