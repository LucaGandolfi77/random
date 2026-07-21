"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Eye, Clock } from "lucide-react";

export default function DashboardAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Views", value: "12,345", change: "+12%", icon: Eye },
          { label: "Watch Time", value: "1,234h", change: "+8%", icon: Clock },
          { label: "Engagement", value: "4.2%", change: "+0.5%", icon: TrendingUp },
          { label: "Revenue", value: "€1,234", change: "+15%", icon: BarChart3 },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-green-500">{stat.change}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-end gap-2">
            {Array.from({ length: 30 }, (_, i) => (
              <div key={i} className="flex-1 rounded-t bg-reel/30 transition-all hover:bg-reel/50" style={{ height: `${Math.random() * 80 + 20}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
