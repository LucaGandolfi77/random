export type Video = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  sourceType: "DEMO" | "UPLOAD" | "YOUTUBE";
  externalId: string | null;
  createdAt: string;
  authorId: string;
  categoryId: string | null;
  boosted?: boolean;
  boostTotal?: number;
  score?: number;
  author?: { id: string; name: string; avatar: string | null } | null;
  category?: { id: string; name: string; slug: string } | null;
  _count: { likes: number; views: number };
};