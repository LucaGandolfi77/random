"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const REPORTS = [
  { id: "1", video: "Spam Content", reporter: "User123", reason: "Spam", status: "PENDING" as const },
  { id: "2", video: "Misleading Title", reporter: "User456", reason: "Misleading", status: "REVIEWING" as const },
];

export function ModerationQueue() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <h3 className="font-medium">Pending Reviews ({REPORTS.length})</h3>
        </div>
        <div className="space-y-2">
          {REPORTS.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded border border-border/50 p-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{r.video}</p>
                <p className="text-xs text-muted-foreground">{r.reason} by {r.reporter}</p>
              </div>
              <Badge variant={r.status === "PENDING" ? "destructive" : "secondary"} className="text-xs">{r.status}</Badge>
              <Button size="sm" variant="ghost" className="h-7 px-2"><CheckCircle className="h-3 w-3 text-green-500" /></Button>
              <Button size="sm" variant="ghost" className="h-7 px-2"><XCircle className="h-3 w-3 text-red-500" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
