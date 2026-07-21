"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye, Clock, DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";

const stats = [
  {
    label: "Total Views",
    value: 12500,
    change: 12.5,
    icon: Eye,
    color: "text-blue-500",
  },
  {
    label: "Watch Time",
    value: "4,200h",
    change: 8.2,
    icon: Clock,
    color: "text-green-500",
  },
  {
    label: "Revenue",
    value: 2500,
    change: 23.1,
    icon: DollarSign,
    color: "text-yellow-500",
    isCurrency: true,
  },
  {
    label: "Subscribers",
    value: 890,
    change: -2.4,
    icon: Users,
    color: "text-purple-500",
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">
                  {stat.isCurrency
                    ? formatCurrency(stat.value as number)
                    : typeof stat.value === "number"
                      ? formatNumber(stat.value)
                      : stat.value}
                </p>
              </div>
              <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {stat.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={stat.change >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(stat.change)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
