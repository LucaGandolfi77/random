"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "DELETE" });
    router.refresh();
    router.push("/");
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="rounded-md px-3 py-1.5 text-white/60 hover:bg-white/10 hover:text-white"
    >
      Logout
    </button>
  );
}