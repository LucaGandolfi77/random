"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { VideoList } from "@/components/dashboard/VideoList";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload, Radio } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your channel overview.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button className="gap-2 bg-reel hover:bg-reel/90">
              <Upload className="h-4 w-4" />
              Upload Reel
            </Button>
          </Link>
          <Link href="/dashboard/broadcast">
            <Button variant="outline" className="gap-2">
              <Radio className="h-4 w-4" />
              Buy Airtime
            </Button>
          </Link>
        </div>
      </div>

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <VideoList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
