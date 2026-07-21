"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const categories = [
  { slug: null, label: "All", icon: "🔥" },
  { slug: "fitness", label: "Fitness", icon: "💪" },
  { slug: "startup", label: "Startup", icon: "🚀" },
  { slug: "ai", label: "AI", icon: "🤖" },
  { slug: "travel", label: "Travel", icon: "✈️" },
  { slug: "cars", label: "Cars", icon: "🚗" },
  { slug: "food", label: "Food", icon: "🍕" },
  { slug: "fashion", label: "Fashion", icon: "👗" },
  { slug: "music", label: "Music", icon: "🎵" },
  { slug: "gaming", label: "Gaming", icon: "🎮" },
];

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <ScrollArea className="mb-6 w-full">
      <div className="flex gap-2 pb-4">
        {categories.map((cat) => (
          <Button
            key={cat.slug ?? "all"}
            variant={selected === cat.slug ? "default" : "outline"}
            size="sm"
            className={`flex-shrink-0 ${
              selected === cat.slug ? "bg-reel hover:bg-reel/90" : ""
            }`}
            onClick={() => onSelect(cat.slug)}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
