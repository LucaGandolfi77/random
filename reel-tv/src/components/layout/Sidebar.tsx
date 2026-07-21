"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import {
  Home,
  LayoutDashboard,
  Upload,
  BarChart3,
  Radio,
  Settings,
  Shield,
  Users,
  Flag,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const creatorNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Videos", href: "/dashboard/videos", icon: <Upload className="h-4 w-4" /> },
  { label: "Analytics", href: "/dashboard/analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Broadcast", href: "/dashboard/broadcast", icon: <Radio className="h-4 w-4" /> },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: <Home className="h-4 w-4" /> },
  { label: "Moderation", href: "/admin/moderation", icon: <Flag className="h-4 w-4" /> },
  { label: "Channels", href: "/admin/channels", icon: <Radio className="h-4 w-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
];

interface SidebarProps {
  isAdmin?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isAdmin = false, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const items = isAdmin ? adminNav : creatorNav;

  return (
    <aside
      className={cn(
        "sticky top-16 flex h-[calc(100vh-4rem)] flex-col border-r border-border/50 bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex-1 overflow-y-auto py-4">
        {!collapsed && (
          <div className="mb-4 px-4">
            <Logo size="sm" />
          </div>
        )}

        <nav className="space-y-1 px-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    collapsed && "justify-center px-2",
                    isActive && "bg-reel/10 text-reel hover:bg-reel/15 hover:text-reel",
                  )}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border/50 p-2">
        <Link href="/">
          <Button variant="ghost" className={cn("w-full justify-start gap-3", collapsed && "justify-center px-2")}>
            <ChevronLeft className="h-4 w-4" />
            {!collapsed && <span>Back to Home</span>}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
