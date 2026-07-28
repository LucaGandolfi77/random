"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: string; name: string; slug: string };

function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}

export function UploadForm({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const rawUrl = String(fd.get("url") ?? "").trim();
    const title = String(fd.get("title") ?? "").trim();

    let sourceType: "UPLOAD" | "YOUTUBE" = "UPLOAD";
    let url = rawUrl;
    let externalId: string | null = null;
    let thumbnailUrl: string | null = null;

    const yt = youtubeId(rawUrl);
    if (yt) {
      sourceType = "YOUTUBE";
      url = `https://www.youtube.com/embed/${yt}`;
      externalId = yt;
      thumbnailUrl = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
    }

    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: fd.get("description") || undefined,
        url,
        thumbnailUrl,
        sourceType,
        externalId,
        categoryId: fd.get("categoryId") || undefined,
      }),
    });
    if (!res.ok) {
      setError("Upload failed — check the URL");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm text-white/70">Title</label>
      <input
        name="title"
        required
        maxLength={100}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
        placeholder="My awesome reel"
      />

      <label className="block text-sm text-white/70">Description</label>
      <textarea
        name="description"
        rows={3}
        maxLength={2000}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
        placeholder="What's it about?"
      />

      <label className="block text-sm text-white/70">Video URL (MP4 or YouTube)</label>
      <input
        name="url"
        required
        type="url"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
        placeholder="https://…mp4  or  https://youtu.be/…"
      />

      <label className="block text-sm text-white/70">Category</label>
      <select
        name="categoryId"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
      >
        <option value="">— none —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black disabled:opacity-60"
      >
        {loading ? "Uploading…" : "Publish reel"}
      </button>
    </form>
  );
}