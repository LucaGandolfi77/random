"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, timeAgo } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  sourceType: "DEMO" | "UPLOAD" | "YOUTUBE";
  createdAt: Date;
  categoryName: string | null;
  likes: number;
  views: number;
  boostTotal: number;
}

export function VideoCard(p: Props) {
  const router = useRouter();
  const [boostAmt, setBoostAmt] = useState(50);
  const [boosting, setBoosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function boost() {
    setBoosting(true);
    setError(null);
    const res = await fetch("/api/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: p.id, amount: boostAmt }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error === "insufficient_credits" ? "Not enough credits — top up your wallet" : "Boost failed");
      setBoosting(false);
      return;
    }
    router.refresh();
    setBoosting(false);
  }

  return (
    <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="relative h-20 w-16 flex-none overflow-hidden rounded-lg bg-black">
        {p.sourceType === "YOUTUBE" ? (
          <img
            src={p.thumbnailUrl ?? `https://i.ytimg.com/vi/${p.url.split("/embed/")[1]}/default.jpg`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <video src={p.url} poster={p.thumbnailUrl ?? undefined} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.title}</p>
        <p className="text-xs text-white/50">
          {p.categoryName ? `#${p.categoryName} · ` : ""}
          {timeAgo(p.createdAt)}
        </p>
        <p className="mt-1 text-xs text-white/60">
          ▶ {formatNumber(p.views)} · ❤ {formatNumber(p.likes)} · 🚀 {formatNumber(p.boostTotal)}
        </p>

        <div className="mt-2 flex items-center gap-2">
          {[25, 50, 200].map((a) => (
            <button
              key={a}
              onClick={() => setBoostAmt(a)}
              className={`rounded-md border px-2 py-1 text-xs ${
                boostAmt === a ? "border-fuchsia-400 bg-fuchsia-500/15" : "border-white/10"
              }`}
            >
              {a}
            </button>
          ))}
          <button
            onClick={boost}
            disabled={boosting}
            className="rounded-md bg-gradient-to-r from-amber-400 to-fuchsia-500 px-3 py-1 text-xs font-bold text-black disabled:opacity-60"
          >
            {boosting ? "…" : "Boost"}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}