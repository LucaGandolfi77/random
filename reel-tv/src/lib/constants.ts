export const APP_NAME = "REELTV";
export const APP_DESCRIPTION = "Buy airtime. Broadcast your Reel. Reach millions.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const BROADCAST_PACKAGES = {
  STARTER: { broadcasts: 1, price: 500, label: "Starter" },
  STANDARD: { broadcasts: 5, price: 1500, label: "Standard" },
  PRO: { broadcasts: 25, price: 5000, label: "Pro" },
  BUSINESS: { broadcasts: -1, price: 20000, label: "Business" },
} as const;

export const VIDEO_STATUSES = {
  UPLOADING: "UPLOADING",
  PROCESSING: "PROCESSING",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export const DEFAULT_CATEGORIES = [
  { name: "Fitness TV", slug: "fitness", icon: "💪" },
  { name: "Startup TV", slug: "startup", icon: "🚀" },
  { name: "AI TV", slug: "ai", icon: "🤖" },
  { name: "Travel TV", slug: "travel", icon: "✈️" },
  { name: "Cars TV", slug: "cars", icon: "🚗" },
  { name: "Food TV", slug: "food", icon: "🍕" },
  { name: "Fashion TV", slug: "fashion", icon: "👗" },
  { name: "Music TV", slug: "music", icon: "🎵" },
  { name: "Gaming TV", slug: "gaming", icon: "🎮" },
];

export const ITEMS_PER_PAGE = 20;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 1 day
} as const;
