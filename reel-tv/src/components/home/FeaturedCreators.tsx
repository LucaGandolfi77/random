"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { motion } from "motion/react";

interface Creator {
  id: string;
  name: string;
  avatar: string | null;
  channelCount: number;
  subscriberCount: number;
}

interface FeaturedCreatorsProps {
  creators: Creator[];
}

export function FeaturedCreators({ creators }: FeaturedCreatorsProps) {
  return (
    <section className="py-6">
      <div className="mb-4 flex items-center justify-between px-4">
        <h2 className="text-xl font-bold">Featured Creators</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin">
        {creators.map((creator, i) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className="w-48 flex-shrink-0 border-border/50 bg-card/50 text-center">
              <CardContent className="p-4">
                <Avatar className="mx-auto mb-3 h-16 w-16">
                  <AvatarImage src={creator.avatar ?? undefined} />
                  <AvatarFallback className="bg-reel/10 text-reel">
                    {creator.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="mb-1 truncate text-sm font-semibold">{creator.name ?? "Unknown"}</h3>
                <p className="text-xs text-muted-foreground">
                  {creator.channelCount} channels
                </p>
                <p className="text-xs text-muted-foreground">
                  {creator.subscriberCount.toLocaleString()} subs
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
