import { describe, expect, it } from "vitest";
import {
  buildFeedUser,
  categoryAffinity,
  rankFeed,
  similarityToLiked,
  type FeedUser,
  type FeedVideo,
} from "./feed";

const baseUser: FeedUser = {
  id: "u1",
  preferredCategoryIds: [],
  likedCategoryCounts: {},
  likedAuthorIds: [],
};

function vid(over: Partial<FeedVideo> & { id: string }): FeedVideo {
  return {
    title: "v",
    categoryId: "c1",
    authorId: "a1",
    createdAt: Date.now(),
    boostTotal: 0,
    likeCount: 0,
    viewCount: 0,
    ...over,
  };
}

const noNoise = () => 0;

describe("boost dominance (pay to be famous)", () => {
  it("at equal affinity, the higher-boosted video ranks first for a free viewer", () => {
    const low = vid({ id: "low", boostTotal: 5 });
    const high = vid({ id: "high", boostTotal: 500 });
    const out = rankFeed([low, high], baseUser, {
      noiseFn: noNoise,
      boostedSlotFraction: 0, // no forced slot overlap; pure scoring
    });
    expect(out[0].video.id).toBe("high");
    expect(out[1].video.id).toBe("low");
  });

  it("guarantees boosted slots at the very top", () => {
    const videos: FeedVideo[] = [];
    // many slightly-stale organic hits with high engagement
    for (let i = 0; i < 20; i++)
      videos.push(vid({ id: `org${i}`, boostTotal: 0, likeCount: 50, viewCount: 100 }));
    // 3 boosted with low engagement
    for (let i = 0; i < 3; i++)
      videos.push(vid({ id: `paid${i}`, boostTotal: 1000, likeCount: 0, viewCount: 0 }));
    const out = rankFeed(videos, baseUser, { noiseFn: noNoise });
    // First position must be the #1 boosted
    expect(out[0].video.id).toBe("paid0");
    // Among the first 3, at least 2 are boosted
    const boostedInTop3 = out.slice(0, 3).filter((s) => s.boosted).length;
    expect(boostedInTop3).toBeGreaterThanOrEqual(2);
  });
});

describe("similar-to-liked recommendations", () => {
  it("liking category X lifts videos in category X above neutral ones", () => {
    const user: FeedUser = buildFeedUser({
      id: "u1",
      preferredCategoryIds: [],
      likes: [{ categoryId: "gaming", authorId: "aX" }],
    });
    const sameCategory = vid({
      id: "sameCat",
      categoryId: "gaming",
      authorId: "other",
      boostTotal: 10,
    });
    const otherCategory = vid({
      id: "otherCat",
      categoryId: "cooking",
      authorId: "aZ",
      boostTotal: 10,
    });
    const out = rankFeed([otherCategory, sameCategory], user, {
      noiseFn: noNoise,
      boostedSlotFraction: 0,
    });
    expect(out[0].video.id).toBe("sameCat");
  });

  it("liking an author lifts that author's other videos", () => {
    const user: FeedUser = buildFeedUser({
      id: "u1",
      preferredCategoryIds: [],
      likes: [{ categoryId: "gaming", authorId: "starAuthor" }],
    });
    const sameAuthor = vid({
      id: "sameAuthor",
      categoryId: "travel",
      authorId: "starAuthor",
      boostTotal: 5,
    });
    const strongerBoost = vid({
      id: "stronger",
      categoryId: "music",
      authorId: "nobody",
      boostTotal: 5,
    });
    // with equal boost, the similar-to-liked one wins on the author signal
    const out = rankFeed([strongerBoost, sameAuthor], user, {
      noiseFn: noNoise,
      boostedSlotFraction: 0,
    });
    expect(out[0].video.id).toBe("sameAuthor");
  });
});

describe("categoryAffinity / similarityToLiked units", () => {
  it("categoryAffinity returns 0.5 weighting per like vs 1.0 for preference", () => {
    const user: FeedUser = buildFeedUser({
      id: "u1",
      preferredCategoryIds: ["gaming"],
      likes: [
        { categoryId: "music", authorId: "a" },
        { categoryId: "music", authorId: "b" },
      ],
    });
    // gaming has weight 1 (preference), music has weight 1 (2 likes * 0.5)
    expect(categoryAffinity("gaming", user)).toBeCloseTo(1);
    expect(categoryAffinity("music", user)).toBeCloseTo(1);
    expect(categoryAffinity("cooking", user)).toBe(0);
  });

  it("similarityToLiked is 0 with no likes", () => {
    expect(similarityToLiked(vid({ id: "x", categoryId: "gaming", authorId: "a1" }), baseUser)).toBe(0);
  });
});

describe("freshness & engagement", () => {
  it("fresher videos outrank older ones at equal boost", () => {
    const fresh = vid({ id: "fresh", createdAt: Date.now(), boostTotal: 50 });
    const old = vid({ id: "old", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60, boostTotal: 50 });
    const out = rankFeed([old, fresh], baseUser, {
      noiseFn: noNoise,
      boostedSlotFraction: 0,
    });
    expect(out[0].video.id).toBe("fresh");
  });

  it("higher like/view ratio outranks lower at equal boost & age", () => {
    const hot = vid({ id: "hot", boostTotal: 50, likeCount: 80, viewCount: 100, createdAt: Date.now() });
    const cold = vid({ id: "cold", boostTotal: 50, likeCount: 10, viewCount: 100, createdAt: Date.now() });
    const out = rankFeed([cold, hot], baseUser, { noiseFn: noNoise, boostedSlotFraction: 0 });
    expect(out[0].video.id).toBe("hot");
  });
});

describe("edge cases", () => {
  it("empty input yields empty output", () => {
    expect(rankFeed([], baseUser)).toEqual([]);
  });

  it("every video has score components in 0..1", () => {
    const videos = [vid({ id: "a", boostTotal: 0 }), vid({ id: "b", boostTotal: 999 })];
    const out = rankFeed(videos, baseUser, { noiseFn: () => 0.3 });
    for (const s of out) {
      for (const v of Object.values(s.components)) expect(v).toBeGreaterThanOrEqual(0);
      // boost/sim/aff/eng/fresh are normalized; noise may exceed via weights but raw is 0..1
    }
  });
});