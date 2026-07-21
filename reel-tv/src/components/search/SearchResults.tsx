"use client";

import { ChannelCarousel } from "@/components/home/ChannelCarousel";
import { TrendingSection } from "@/components/home/TrendingSection";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search } from "lucide-react";
import type { ChannelWithCategory, VideoWithDetails } from "@/types";

interface SearchResultsProps {
  query: string;
  category: string | null;
}

// Demo data - would be fetched from API in production
const demoChannels: ChannelWithCategory[] = [
  {
    id: "1",
    name: "Fitness TV",
    slug: "fitness-tv",
    description: "Your daily dose of fitness motivation",
    logo: null,
    banner: null,
    subscriberCount: 12500,
    isFeatured: true,
    category: { name: "Fitness", slug: "fitness", icon: "💪" },
    owner: { name: "Fitness Pro", avatar: null },
    _count: { videos: 45, subscriptions: 12500 },
  },
  {
    id: "2",
    name: "AI TV",
    slug: "ai-tv",
    description: "Exploring artificial intelligence",
    logo: null,
    banner: null,
    subscriberCount: 8900,
    isFeatured: true,
    category: { name: "AI", slug: "ai", icon: "🤖" },
    owner: { name: "AI Explorer", avatar: null },
    _count: { videos: 32, subscriptions: 8900 },
  },
];

const demoVideos: VideoWithDetails[] = [
  {
    id: "1",
    title: "10-Minute HIIT Workout for Beginners",
    description: "Get fit in just 10 minutes",
    url: "",
    thumbnailUrl: null,
    duration: 600,
    status: "ACTIVE",
    createdAt: new Date(),
    user: { name: "Fitness Pro", avatar: null },
    _count: { likes: 890, views: 12500, comments: 45 },
  },
];

export function SearchResults({ query, category }: SearchResultsProps) {
  const hasResults = query || category;

  if (!hasResults) {
    return (
      <div className="space-y-8">
        <ChannelCarousel title="Popular Channels" channels={demoChannels} />
        <TrendingSection videos={demoVideos} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ChannelCarousel title="Channels" channels={demoChannels} seeAllHref="/search" />
      <TrendingSection videos={demoVideos} />
    </div>
  );
}
