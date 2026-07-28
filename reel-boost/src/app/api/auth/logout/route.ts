import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}