"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const DATA = [
  { date: "Jan 1", revenue: 120 },
  { date: "Jan 2", revenue: 180 },
  { date: "Jan 3", revenue: 90 },
  { date: "Jan 4", revenue: 250 },
  { date: "Jan 5", revenue: 320 },
  { date: "Jan 6", revenue: 280 },
  { date: "Jan 7", revenue: 350 },
];

export function RevenueChart() {
  const maxRevenue = Math.max(...DATA.map((d) => d.revenue));
  const totalRevenue = DATA.reduce((s, d) => s + d.revenue, 0);
  const trend = ((DATA[DATA.length - 1].revenue - DATA[0].revenue) / DATA[0].revenue) * 100;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Revenue</span>
          <span className="flex items-center gap-1 text-sm font-normal text-green-500">
            {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-3xl font-bold">€{totalRevenue.toLocaleString()}</p>
        <div className="flex h-40 items-end gap-1">
          {DATA.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-reel/40 transition-all hover:bg-reel/60"
                style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
              />
              <span className="text-[10px] text-muted-foreground">{d.date.split(" ")[1]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
