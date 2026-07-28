"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Cat = { id: string; name: string; slug: string; icon: string | null };

export function OnboardingPicker({ categories }: { categories: Cat[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: [...selected] }),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((c) => {
          const on = selected.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`rounded-xl border p-4 text-left transition ${
                on
                  ? "border-fuchsia-400 bg-fuchsia-500/15"
                  : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <div className="text-2xl">{c.icon ?? "🎬"}</div>
              <div className="mt-1 font-semibold">{c.name}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          disabled={saving}
          onClick={save}
          className="rounded-full bg-white px-6 py-2.5 font-semibold text-black disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save & start watching"}
        </button>
        <Link href="/" className="text-sm text-white/60">
          skip
        </Link>
      </div>
    </>
  );
}