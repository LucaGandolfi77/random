"use client";

export function AnalyticsChart() {
  // Placeholder chart - would use recharts or similar in production
  const data = [
    { day: "Mon", views: 1200 },
    { day: "Tue", views: 1800 },
    { day: "Wed", views: 2200 },
    { day: "Thu", views: 1600 },
    { day: "Fri", views: 2800 },
    { day: "Sat", views: 3200 },
    { day: "Sun", views: 2400 },
  ];

  const maxViews = Math.max(...data.map((d) => d.views));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-reel/80 transition-all hover:bg-reel"
              style={{ height: `${(d.views / maxViews) * 100}%` }}
            />
            <span className="text-xs text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">This Week</span>
        <span className="font-semibold">15,200 views</span>
      </div>
    </div>
  );
}
