"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WalletPanel() {
  const router = useRouter();
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  async function topup() {
    setLoading(true);
    await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm text-white/70">Top up your balance (simulated)</p>
      <div className="mt-3 flex gap-2">
        {[100, 500, 1000].map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className={`rounded-lg border px-4 py-2 text-sm ${
              amount === a
                ? "border-fuchsia-400 bg-fuchsia-500/15"
                : "border-white/10 bg-white/5"
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      <button
        onClick={topup}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-white px-4 py-3 font-semibold text-black disabled:opacity-60"
      >
        {loading ? "Processing…" : `Add ${amount} credits`}
      </button>
    </div>
  );
}