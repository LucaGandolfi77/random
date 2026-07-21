"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { CategoryFilter } from "@/components/search/CategoryFilter";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">
        <div className="mb-6">
          <h1 className="mb-4 text-2xl font-bold">Discover Channels & Videos</h1>
          <SearchBar value={query} onChange={setQuery} />
        </div>

        <CategoryFilter selected={category} onSelect={setCategory} />

        <SearchResults query={query} category={category} />
      </main>
      <MobileNav />
    </div>
  );
}
