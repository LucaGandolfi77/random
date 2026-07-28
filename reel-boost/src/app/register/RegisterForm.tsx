"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
        name: fd.get("name"),
      }),
    });
    if (!res.ok) {
      setError("Email already in use");
      setLoading(false);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        name="name"
        placeholder="display name"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
      />
      <input
        name="email"
        type="email"
        placeholder="email"
        required
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
      />
      <input
        name="password"
        type="password"
        placeholder="password (min 6)"
        required
        minLength={6}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
      />
      <p className="text-sm text-white/60">
        You start with 💰 100 free credits to boost your reels.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black disabled:opacity-60"
      >
        {loading ? "Creating…" : "Sign up"}
      </button>
    </form>
  );
}