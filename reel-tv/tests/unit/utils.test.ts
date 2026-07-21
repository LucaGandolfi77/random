import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatNumber,
  formatDuration,
  slugify,
  truncate,
  timeAgo,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "extra");
    expect(result).toContain("base");
    expect(result).toContain("extra");
    expect(result).not.toContain("hidden");
  });
});

describe("formatCurrency", () => {
  it("formats cents to euros", () => {
    expect(formatCurrency(500)).toBe("€5.00");
    expect(formatCurrency(1500)).toBe("€15.00");
    expect(formatCurrency(20000)).toBe("€200.00");
  });
});

describe("formatNumber", () => {
  it("formats small numbers", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(15000)).toBe("15.0K");
  });

  it("formats millions", () => {
    expect(formatNumber(1000000)).toBe("1.0M");
    expect(formatNumber(2500000)).toBe("2.5M");
  });
});

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  it("formats hours", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });
});

describe("slugify", () => {
  it("converts text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("REELTV Channel")).toBe("reeltv-channel");
    expect(slugify("Special @ Characters!")).toBe("special-characters");
  });
});

describe("truncate", () => {
  it("truncates long text", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("does not truncate short text", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });
});

describe("timeAgo", () => {
  it("returns relative time", () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const result = timeAgo(fiveMinAgo);
    expect(result).toBe("5m ago");
  });
});
