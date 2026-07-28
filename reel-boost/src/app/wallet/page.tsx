import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WalletPanel } from "./WalletPanel";
import { timeAgo } from "@/lib/utils";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [balance, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">Your balance</p>
          <p className="mt-1 text-4xl font-bold">💰 {balance?.walletBalance ?? 0}</p>
          <p className="mt-2 text-xs text-white/50">credits — simulated, no real money</p>
        </div>

        <WalletPanel />

        <h2 className="mt-8 text-lg font-semibold">Transactions</h2>
        <div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
          {transactions.length === 0 && (
            <p className="p-4 text-sm text-white/50">No transactions yet.</p>
          )}
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">
                  {t.type === "TOPUP" ? "Top-up" : "Boost spend"}
                  {t.videoId && <span className="ml-1 text-white/40">on #{t.videoId.slice(-6)}</span>}
                </p>
                <p className="text-xs text-white/40">{timeAgo(t.createdAt)}</p>
              </div>
              <span className={t.type === "TOPUP" ? "text-emerald-400" : "text-rose-400"}>
                {t.type === "TOPUP" ? "+" : "-"}{t.amount}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}