"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const REPORTS = [
  { id: "1", video: "Spam Video Title", reporter: "User A", reason: "Spam", status: "PENDING", createdAt: new Date("2025-01-15") },
  { id: "2", video: "Inappropriate Content", reporter: "User B", reason: "Inappropriate", status: "REVIEWING", createdAt: new Date("2025-01-14") },
  { id: "3", video: "Misleading Claims", reporter: "User C", reason: "Misinformation", status: "PENDING", createdAt: new Date("2025-01-13") },
];

export default function AdminModerationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Moderation</h1>
        <p className="text-muted-foreground">Review reported content</p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Pending Reports ({REPORTS.filter((r) => r.status === "PENDING").length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {REPORTS.map((report) => (
              <div key={report.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-4">
                <div className="flex-1">
                  <h3 className="font-medium">{report.video}</h3>
                  <p className="text-sm text-muted-foreground">
                    Reason: {report.reason} &middot; Reported by {report.reporter}
                  </p>
                  <p className="text-xs text-muted-foreground">{report.createdAt.toLocaleDateString()}</p>
                </div>
                <Badge variant={report.status === "PENDING" ? "destructive" : "secondary"}>{report.status}</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
