import { NextResponse, type NextRequest } from "next/server";

// Optional: YouTube Data API v3 search for Shorts.
// Only active if YOUTUBE_API_KEY is set in the environment.
export async function GET(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "youtube_disabled", message: "Set YOUTUBE_API_KEY to enable Shorts import." },
      { status: 501 },
    );
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "shorts";
  const max = Math.min(20, Number(url.searchParams.get("max") ?? 10));

  const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  ytUrl.searchParams.set("key", apiKey);
  ytUrl.searchParams.set("part", "snippet");
  ytUrl.searchParams.set("type", "video");
  ytUrl.searchParams.set("videoEmbeddable", "true");
  ytUrl.searchParams.set("maxResults", String(max));
  ytUrl.searchParams.set("q", `${q} #shorts`);

  try {
    const res = await fetch(ytUrl, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "youtube_error", status: res.status }, { status: 502 });
    }
    const json = (await res.json()) as {
      items: {
        id: { videoId: string };
        snippet: { title: string; description: string; thumbnails: { high?: { url: string } } };
      }[];
    };
    const items = json.items.map((it) => ({
      externalId: it.id.videoId,
      title: it.snippet.title,
      description: it.snippet.description,
      thumbnailUrl: it.snippet.thumbnails.high?.url ?? null,
      url: `https://www.youtube.com/embed/${it.id.videoId}`,
    }));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: "fetch_failed", detail: String(e) }, { status: 500 });
  }
}