"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Radio, Bell, Share2, Heart } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface ChannelHeaderProps {
  channel: {
    name: string;
    description: string | null;
    logo: string | null;
    banner: string | null;
    category: { name: string; icon: string | null } | null;
    owner: { name: string | null; avatar: string | null };
    isFeatured: boolean;
  };
  subscriberCount: number;
}

export function ChannelHeader({ channel, subscriberCount }: ChannelHeaderProps) {
  return (
    <div className="border-b border-border/50 bg-card/50">
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-r from-reel/30 to-background md:h-48">
        {channel.banner && (
          <img src={channel.banner} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-background md:h-20 md:w-20">
              <AvatarImage src={channel.owner.avatar ?? undefined} />
              <AvatarFallback className="bg-reel/10 text-2xl text-reel">
                {channel.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold md:text-2xl">{channel.name}</h1>
                {channel.isFeatured && (
                  <Badge className="bg-reel/10 text-reel">
                    <Radio className="mr-1 h-3 w-3" />
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {channel.category?.icon} {channel.category?.name} · {formatNumber(subscriberCount)}{" "}
                subscribers
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="gap-2 bg-reel hover:bg-reel/90">
              <Radio className="h-4 w-4" />
              Subscribe
            </Button>
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {channel.description && (
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{channel.description}</p>
        )}
      </div>
    </div>
  );
}
