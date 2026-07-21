"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Mail, Shield } from "lucide-react";

const USERS = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "CREATOR", videos: 12, joined: new Date("2024-12-01") },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "CREATOR", videos: 8, joined: new Date("2024-11-15") },
  { id: "3", name: "Admin User", email: "admin@reeltv.app", role: "ADMIN", videos: 0, joined: new Date("2024-10-01") },
  { id: "4", name: "Bob Wilson", email: "bob@example.com", role: "VIEWER", videos: 0, joined: new Date("2025-01-01") },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-500",
  CREATOR: "bg-blue-500/10 text-blue-500",
  VIEWER: "bg-gray-500/10 text-gray-500",
};

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage platform users</p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Users ({USERS.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {USERS.map((user) => (
              <div key={user.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{user.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </div>
                <Badge className={roleColors[user.role] ?? ""}>
                  <Shield className="mr-1 h-3 w-3" />
                  {user.role}
                </Badge>
                <span className="text-sm text-muted-foreground">{user.videos} videos</span>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
