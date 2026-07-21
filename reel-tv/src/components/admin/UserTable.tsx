"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield } from "lucide-react";

const USERS = [
  { id: "1", name: "John Doe", role: "CREATOR" as const, videos: 12 },
  { id: "2", name: "Jane Smith", role: "CREATOR" as const, videos: 8 },
  { id: "3", name: "Admin User", role: "ADMIN" as const, videos: 0 },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-500",
  CREATOR: "bg-blue-500/10 text-blue-500",
  VIEWER: "bg-gray-500/10 text-gray-500",
};

export function UserTable() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Recent Users</h3>
        </div>
        <div className="space-y-2">
          {USERS.map((user) => (
            <div key={user.id} className="flex items-center gap-3 rounded border border-border/50 p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.videos} videos</p>
              </div>
              <Badge className={`text-xs ${roleColors[user.role] ?? ""}`}>
                <Shield className="mr-1 h-3 w-3" />{user.role}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
