import { describe, it, expect } from "vitest";

// Test the scheduling algorithm logic (without DB)
const PACKAGE_WEIGHTS: Record<string, number> = {
  STARTER: 1,
  STANDARD: 2,
  PRO: 3,
  BUSINESS: 4,
};

function selectWeightedRandom(
  orders: Array<{ videoId: string; package: string }>,
  excludeVideoId?: string,
): string | null {
  const eligible = excludeVideoId
    ? orders.filter((o) => o.videoId !== excludeVideoId)
    : orders;

  if (eligible.length === 0) return orders[0]?.videoId ?? null;

  const totalWeight = eligible.reduce(
    (sum, order) => sum + (PACKAGE_WEIGHTS[order.package] ?? 1),
    0,
  );

  let random = totalWeight * 0.5; // deterministic for testing
  for (const order of eligible) {
    random -= PACKAGE_WEIGHTS[order.package] ?? 1;
    if (random <= 0) return order.videoId;
  }

  return eligible[0]?.videoId ?? null;
}

describe("Scheduling Algorithm", () => {
  const orders = [
    { videoId: "v1", package: "STARTER" },
    { videoId: "v2", package: "PRO" },
    { videoId: "v3", package: "STANDARD" },
  ];

  it("selects a video from eligible orders", () => {
    const result = selectWeightedRandom(orders);
    expect(result).toBeTruthy();
    expect(["v1", "v2", "v3"]).toContain(result);
  });

  it("excludes the last played video", () => {
    const result = selectWeightedRandom(orders, "v2");
    expect(result).toBeTruthy();
    expect(result).not.toBe("v2");
  });

  it("returns null for empty orders", () => {
    const result = selectWeightedRandom([]);
    expect(result).toBeNull();
  });

  it("allows repetition when only one video exists", () => {
    const singleOrder = [{ videoId: "v1", package: "STARTER" }];
    const result = selectWeightedRandom(singleOrder, "v1");
    expect(result).toBe("v1");
  });

  it("favors higher package tiers", () => {
    const results = new Map<string, number>();
    for (let i = 0; i < 100; i++) {
      // Use different random seeds
      const fakeRandom = i / 100;
      const eligible = orders;
      const totalWeight = eligible.reduce(
        (sum, order) => sum + (PACKAGE_WEIGHTS[order.package] ?? 1),
        0,
      );
      let random = fakeRandom * totalWeight;
      let selected = eligible[0].videoId;
      for (const order of eligible) {
        random -= PACKAGE_WEIGHTS[order.package] ?? 1;
        if (random <= 0) {
          selected = order.videoId;
          break;
        }
      }
      results.set(selected, (results.get(selected) ?? 0) + 1);
    }

    // PRO (weight 3) should be selected more than STARTER (weight 1)
    const proCount = results.get("v2") ?? 0;
    const starterCount = results.get("v1") ?? 0;
    expect(proCount).toBeGreaterThan(starterCount);
  });
});
