"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Volume2, VolumeX, Music2 } from "lucide-react";
import type { Video } from "@/lib/types";

interface FeedItem extends Video {
  score?: number;
  boosted?: boolean;
  boostTotal?: number;
}

interface Props {
  initialItems: FeedItem[];
  userLikedIds: string[];
}

export function FeedView({ initialItems, userLikedIds }: Props) {
  const [items, setItems] = useState(initialItems);
  const [liked, setLiked] = useState<Set<string>>(new Set(userLikedIds));
  const [muted, setMuted] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const reportedRef = useRef<Set<string>>(new Set());

  const playActive = useCallback((index: number) => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === index) {
        v.muted = muted;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [muted]);

  useEffect(() => {
    playActive(activeIndex);
  }, [activeIndex, playActive]);

  // IntersectionObserver for scroll snap index + view tracking.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
            const item = items[idx];
            if (item && !reportedRef.current.has(item.id)) {
              reportedRef.current.add(item.id);
              // record a view + mark completed for short clips
              fetch("/api/views", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  videoId: item.id,
                  watchTime: 1,
                  completed: true,
                }),
              }).catch(() => {});
            }
          }
        }
      },
      { root: container, threshold: [0.6] },
    );
    const els = container.querySelectorAll("[data-index]");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  async function toggleLike(id: string) {
    const next = new Set(liked);
    let liked_now = false;
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      liked_now = true;
    }
    setLiked(next);
    await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: id }),
    }).catch(() => {});
    void liked_now;
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center text-white/60">
        <p className="text-2xl">🎬</p>
        <p>No videos yet. Be the first to upload!</p>
        <Link
          href="/upload"
          className="mt-2 rounded-full bg-white px-5 py-2 font-semibold text-black"
        >
          Upload a reel
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute right-4 top-4 z-40 rounded-full bg-black/50 p-2 text-white backdrop-blur"
        aria-label="toggle mute"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div ref={containerRef} className="snap-container no-scrollbar">
        {items.map((item, i) => {
          const isYouTube = item.sourceType === "YOUTUBE";
          const authorName = item.author?.name ?? "unknown";
          return (
            <div
              key={item.id}
              data-index={i}
              className="snap-item relative flex h-[100dvh] items-center justify-center bg-black"
            >
              <div className="relative h-full w-full max-w-md">
                {isYouTube ? (
                  <iframe
                    className="h-full w-full"
                    src={`${item.url}?autoplay=1&mute=${
                      muted ? 1 : 0
                    }&controls=0&rel=0&playsinline=1`}
                    title={item.title}
                    allow="autoplay; encrypted-media; fullscreen"
                  />
                ) : (
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    className="h-full w-full object-cover"
                    src={item.url}
                    poster={item.thumbnailUrl ?? undefined}
                    playsInline
                    loop
                    muted={muted}
                    preload="metadata"
                  />
                )}

                {/* gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                {/* right action rail */}
                <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-5">
                  <button
                    onClick={() => toggleLike(item.id)}
                    className="flex flex-col items-center"
                    aria-label="like"
                  >
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur ${
                        liked.has(item.id) ? "text-red-500" : "text-white"
                      }`}
                    >
                      <Heart size={26} fill={liked.has(item.id) ? "currentColor" : "none"} />
                    </span>
                    <span className="mt-1 text-xs drop-shadow">
                      {item._count.likes + (liked.has(item.id) ? 1 : 0)}
                    </span>
                  </button>
                  <div className="flex flex-col items-center text-white/90">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur">
                      <Music2 size={22} />
                    </span>
                  </div>
                </div>

                {/* boosted badge */}
                {item.boosted && (
                  <div className="absolute left-3 top-1/2 z-20 -translate-y-1/2">
                    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500 px-3 py-1.5 text-xs font-bold text-black shadow-lg">
                      🚀 Boosted · {item.boostTotal}
                    </div>
                  </div>
                )}

                {/* bottom caption */}
                <div className="absolute bottom-6 left-3 z-20 max-w-[80%] text-white">
                  <p className="text-sm font-semibold drop-shadow">
                    @{authorName}
                    {item.author?.id && (
                      <Link
                        href={`/dashboard`}
                        className="ml-2 text-xs font-normal text-white/60"
                      >
                        view
                      </Link>
                    )}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm drop-shadow">{item.title}</p>
                  {item.category && (
                    <Link
                      href={`/?category=${item.category.slug}`}
                      className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/90"
                    >
                      #{item.category.slug}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}