"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Radio, Video, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

const STATS = [
  { label: "Total Users", value: "1,234", icon: Users, change: "+12%" },
  { label: "Active Channels", value: "56", icon: Radio, change: "+5%" },
  { label: "Total Videos", value: "8,901", icon: Video, change: "+18%" },
  { label: "Revenue", value: "€45,678", icon: DollarSign, change: "+22%" },
];

const RECENT_ORDERS = [
  { id: "1", user: "John Doe", channel: "Fitness TV", package: "PRO", amount: "€50", status: "PAID" },
  { id: "2", user: "Jane Smith", channel: "AI TV", package: "STARTER", amount: "€5", status: "PENDING" },
  { id: "3", user: "Bob Wilson", channel: "Gaming TV", package: "BUSINESS", amount: "€200", status: "ACTIVE" },
];

const PENDING_REPORTS = [
  { id: "1", video: "Inappropriate Content", reporter: "User A", status: "PENDING" },
  { id: "2", video: "Spam Video", reporter: "User B", status: "REVIEWING" },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {STATS.map((stat) => (
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RECENT_ORDERS.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-medium">{order.user}</p>
                    <p className="text-sm text-muted-foreground">{order.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{order.amount}</p>
                    <Badge variant={order.status === "PAID" ? "default" : order.status === "ACTIVE" ? "secondary" : "outline"}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              Pending Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PENDING_REPORTS.map((report) => (
                <div key={report.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-medium">{report.video}</p>
                    <p className="text-sm text-muted-foreground">Reported by {report.reporter}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Review</Button>
                    <Button size="sm" variant="destructive">Dismiss</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
