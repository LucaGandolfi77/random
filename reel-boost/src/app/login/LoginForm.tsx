"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    if (!res.ok) {
      setError("Invalid credentials");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        placeholder="password"
        required
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black disabled:opacity-60"
      >
        {loading ? "Logging in…" : "Log in"}
      </button>
      <p className="text-sm text-white/60">
        No account?{" "}
        <a href="/register" className="text-fuchsia-400">
          Sign up
        </a>
      </p>
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/60">
        <p className="font-semibold text-white/80">Demo accounts:</p>
        <p className="mt-1">creator@demo.app / demo123 (boosted)</p>
        <p>viewer@demo.app / demo123</p>
      </div>
    </form>
  );
}