// ──────────────────────────────────────────────────────────────
// Feed algorithm — "pay to be famous" + content-based recommendations.
//
// Free users watch a feed ranked by how much each video was boosted
// (paid), blended with personalization from categories they chose
// and videos they liked ("reel più simili a quelli likati").
//
// Pure functions for testability: no DB, no I/O.
// ──────────────────────────────────────────────────────────────

export interface FeedVideo {
  id: string;
  title: string;
  categoryId: string | null;
  authorId: string;
  createdAt: number; // epoch ms
  boostTotal: number; // total credits spent boosting this video
  likeCount: number;
  viewCount: number;
}

export interface FeedUser {
  id: string;
  /** category ids the user explicitly chose during onboarding */
  preferredCategoryIds: string[];
  /** per-category count of videos the user liked — drives similarity */
  likedCategoryCounts: Record<string, number>;
  /** author ids the user has liked content from */
  likedAuthorIds: string[];
}

export interface Weights {
  boost: number;
  affinity: number;
  similarity: number;
  engagement: number;
  freshness: number;
  noise: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  boost: 1.0,
  affinity: 0.7,
  similarity: 0.5,
  engagement: 0.3,
  freshness: 0.2,
  noise: 0.05,
};

export interface ScoredVideo {
  video: FeedVideo;
  score: number;
  components: {
    boost: number;
    affinity: number;
    similarity: number;
    engagement: number;
    freshness: number;
    noise: number;
  };
  boosted: boolean;
}

const FRESHNESS_HALFLIFE_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** map.userId 0..1 */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** normalized boost: log scale so a few big spenders don't drown everything */
function boostNorm(boost: number, maxBoost: number): number {
  if (maxBoost <= 0) return 0;
  return clamp01(Math.log10(1 + boost) / Math.log10(1 + maxBoost));
}

/** normalized engagement: likes per view with a smoothing prior */
function engagementNorm(likes: number, views: number): number {
  // Beta(like+1, view-like+1) posterior mean-like estimate
  const a = likes + 1;
  const b = Math.max(0, views - likes) + 1;
  return clamp01(a / (a + b));
}

/** exponential time decay — fresher is better */
function freshness(createdAt: number, now: number): number {
  const ageDays = Math.max(0, (now - createdAt) / MS_PER_DAY);
  return clamp01(Math.pow(0.5, ageDays / FRESHNESS_HALFLIFE_DAYS));
}

/**
 * User's affinity towards a given category.
 * Built from explicit preferences (+1 each) and like history (+0.5 per like
 * in that category). Normalized to the user's strongest category → 0..1.
 */
export function categoryAffinity(
  categoryId: string | null,
  user: FeedUser,
): number {
  if (!categoryId) return 0;
  const scores: Record<string, number> = {};
  for (const cid of user.preferredCategoryIds) {
    scores[cid] = (scores[cid] ?? 0) + 1;
  }
  for (const [cid, count] of Object.entries(user.likedCategoryCounts)) {
    scores[cid] = (scores[cid] ?? 0) + count * 0.5;
  }
  const max = Math.max(0, ...Object.values(scores));
  if (max <= 0) return 0;
  return clamp01((scores[categoryId] ?? 0) / max);
}

/**
 * Similarity of a candidate video to the videos the user liked.
 * Content-based: same category or same author as a liked item.
 */
export function similarityToLiked(
  video: FeedVideo,
  user: FeedUser,
): number {
  let score = 0;
  if (video.categoryId && (user.likedCategoryCounts[video.categoryId] ?? 0) > 0) {
    score += 0.6;
  }
  if (user.likedAuthorIds.includes(video.authorId)) {
    score += 0.4;
  }
  return clamp01(score);
}

export interface RankOptions {
  now?: number;
  weights?: Partial<Weights>;
  /** fraction of slots reserved for top-boosted "🔥 Boosted" videos (0..1) */
  boostedSlotFraction?: number;
  /** inject deterministic noise instead of Math.random — for tests */
  noiseFn?: (i: number) => number;
}

/**
 * Rank videos into a personalized feed.
 *
 * Ordering guarantees:
 *  - Higher boost → higher score (at equal affinity/engagement).
 *  - Liking a category X raises videos in category X.
 *  - Liking an author raises that author's other videos.
 *  - A guaranteed share of boosted slots is interleaved at the top.
 */
export function rankFeed(
  videos: FeedVideo[],
  user: FeedUser,
  options: RankOptions = {},
): ScoredVideo[] {
  const now = options.now ?? Date.now();
  const w = { ...DEFAULT_WEIGHTS, ...options.weights };
  const noiseFn = options.noiseFn ?? (() => Math.random());

  if (videos.length === 0) return [];

  const maxBoost = Math.max(1, ...videos.map((v) => v.boostTotal));

  const scored: ScoredVideo[] = videos.map((video, i) => {
    const boost = boostNorm(video.boostTotal, maxBoost);
    const affinity = categoryAffinity(video.categoryId, user);
    const sim = similarityToLiked(video, user);
    const eng = engagementNorm(video.likeCount, video.viewCount);
    const fresh = freshness(video.createdAt, now);
    const noise = noiseFn(i);
    const score =
      w.boost * boost +
      w.affinity * affinity +
      w.similarity * sim +
      w.engagement * eng +
      w.freshness * fresh +
      w.noise * noise;
    return {
      video,
      score,
      boosted: boost > 0,
      components: {
        boost,
        affinity,
        similarity: sim,
        engagement: eng,
        freshness: fresh,
        noise,
      },
    };
  });

  // Stable-ish: sort by score desc.
  scored.sort((a, b) => b.score - a.score);

  // Guaranteed boosted slots at the very top: take the highest-boost videos
  // not already first and pin a fraction of positions, interleaved.
  const fraction = options.boostedSlotFraction ?? 0.2;
  const boostedCount = Math.min(
    scored.filter((s) => s.boosted).length,
    Math.max(1, Math.round(scored.length * fraction)),
  );

  if (boostedCount > 0) {
    const byBoost = [...scored]
      .filter((s) => s.boosted)
      .sort((a, b) => b.components.boost - a.components.boost);
    const ranked = [...scored];
    // Remove boosted ones from their current positions, then interleave at top.
    const boostedSet = new Set(byBoost.slice(0, boostedCount).map((s) => s.video.id));
    const rest = ranked.filter((s) => !boostedSet.has(s.video.id));
    const pinned = byBoost.slice(0, boostedCount);
    // Interleave: pinned[0] at 0, rest[0] at 1, pinned[1] at 2, ...
    const merged: ScoredVideo[] = [];
    let ri = 0;
    for (let k = 0; k < boostedCount; k++) {
      merged.push(pinned[k]);
      if (ri < rest.length) merged.push(rest[ri++]);
    }
    while (ri < rest.length) merged.push(rest[ri++]);
    return merged;
  }

  return scored;
}

/** Build a FeedUser from raw primitives (for server/API usage). */
export function buildFeedUser(input: {
  id: string;
  preferredCategoryIds: string[];
  likes: { categoryId: string | null; authorId: string }[];
}): FeedUser {
  const likedCategoryCounts: Record<string, number> = {};
  const likedAuthorIds: string[] = [];
  for (const l of input.likes) {
    if (l.categoryId) likedCategoryCounts[l.categoryId] = (likedCategoryCounts[l.categoryId] ?? 0) + 1;
    if (!likedAuthorIds.includes(l.authorId)) likedAuthorIds.push(l.authorId);
  }
  return {
    id: input.id,
    preferredCategoryIds: input.preferredCategoryIds,
    likedCategoryCounts,
    likedAuthorIds,
  };
}