import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const user = await getCurrentUser();
  let balance = 0;
  if (user) {
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { walletBalance: true },
    });
    balance = u?.walletBalance ?? 0;
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
        <span className="text-lg">🚀</span>
        <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
          ReelBoost
        </span>
      </Link>

      <nav className="flex items-center gap-1 text-sm">
        <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-white/10">
          Feed
        </Link>
        {user ? (
          <>
            <Link href="/upload" className="rounded-md px-3 py-1.5 hover:bg-white/10">
              Upload
            </Link>
            <Link href="/dashboard" className="rounded-md px-3 py-1.5 hover:bg-white/10">
              Dashboard
            </Link>
            <Link href="/wallet" className="rounded-md px-3 py-1.5 hover:bg-white/10">
              <span className="mr-1">💰</span>
              {balance}
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-white/10">
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-white px-3 py-1.5 font-semibold text-black hover:bg-white/90"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}