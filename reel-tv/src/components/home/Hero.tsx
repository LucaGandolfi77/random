"use client";

import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import Link from "next/link";
import { Play, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-reel/20 via-background to-background" />
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-reel/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-reel/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-reel/20 bg-reel/10 px-4 py-1.5 text-sm text-reel">
              <Zap className="h-4 w-4" />
              Buy Airtime. Go Live.
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
          >
            Broadcast Your{" "}
            <span className="text-gradient">Reel</span>{" "}
            to the World
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            The platform where creators buy broadcasting time on topic-dedicated channels.
            YouTube meets TikTok meets TV.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 bg-reel px-8 hover:bg-reel/90">
                <Play className="h-5 w-5" />
                Start Broadcasting
              </Button>
            </Link>
            <Link href="/search">
              <Button size="lg" variant="outline" className="px-8">
                Browse Channels
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 grid grid-cols-3 gap-8 md:gap-16"
          >
            {[
              { value: "10K+", label: "Creators" },
              { value: "50K+", label: "Videos Broadcast" },
              { value: "1M+", label: "Hours Watched" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold md:text-3xl">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
