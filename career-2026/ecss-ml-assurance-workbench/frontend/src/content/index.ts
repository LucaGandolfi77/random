// Centralized profile + publication content loader (single source of truth).
import profile from "./profile.json";
import articleDataReadiness from "./publications/data-readiness-review-space-ml.json";
import articleTesting from "./publications/testing-spacecraft-anomaly-detector.json";
import articleBitflips from "./publications/radiation-bit-flips-neural-networks.json";
import articleSafetyCage from "./publications/deterministic-safety-cage-lunar-lander.json";

export interface ArticleSection {
  type: "h2" | "p" | "ul" | "checklist" | "table" | "note" | "quote";
  id?: string;
  title?: string;
  text?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export interface Article {
  title: string;
  slug: string;
  description: string;
  publicationDate: string;
  updatedDate: string;
  author: string;
  category: string;
  tags: string[];
  readingTime: number;
  featuredProject: string;
  status: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  content: ArticleSection[];
}

export const publications: Article[] = [
  articleDataReadiness as unknown as Article,
  articleTesting as unknown as Article,
  articleBitflips as unknown as Article,
  articleSafetyCage as unknown as Article,
].sort((a, b) => b.publicationDate.localeCompare(a.publicationDate));

export function getPublication(slug: string): Article | undefined {
  return publications.find((p) => p.slug === slug);
}

export function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateReadingTime(sectionTexts: string[]): number {
  const total = sectionTexts.reduce((sum, t) => sum + words(t), 0);
  return Math.max(1, Math.round(total / 200));
}

export { profile };
