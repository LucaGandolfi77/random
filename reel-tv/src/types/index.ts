export type BroadcastPackage = "STARTER" | "STANDARD" | "PRO" | "BUSINESS";

export type VideoStatus =
  | "UPLOADING"
  | "PROCESSING"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "ARCHIVED";

export type OrderStatus = "PENDING" | "PAID" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export type Role = "VIEWER" | "CREATOR" | "ADMIN";

export interface ChannelWithCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  subscriberCount: number;
  isFeatured: boolean;
  category: { name: string; slug: string; icon: string | null } | null;
  owner: { name: string | null; avatar: string | null };
  _count: { videos: number; subscriptions: number };
}

export interface VideoWithDetails {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  status: VideoStatus;
  createdAt: Date;
  user: { name: string | null; avatar: string | null };
  channel?: { name: string; slug: string };
  _count: { likes: number; views: number; comments: number };
}

export interface ScheduleEntry {
  id: string;
  scheduledAt: Date;
  endedAt: Date | null;
  isActive: boolean;
  broadcastCount: number;
  video: {
    id: string;
    title: string;
    url: string;
    thumbnailUrl: string | null;
    duration: number | null;
  };
  order: {
    package: BroadcastPackage;
    priority: number;
  } | null;
}

export interface DashboardStats {
  totalViews: number;
  totalWatchTime: number;
  totalRevenue: number;
  totalSubscribers: number;
  viewsChange: number;
  revenueChange: number;
  subscribersChange: number;
}

export interface AnalyticsDataPoint {
  date: string;
  views: number;
  watchTime: number;
  revenue: number;
}
