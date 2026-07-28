import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(40).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name ?? email.split("@")[0], walletBalance: 100 },
    select: { id: true, email: true, name: true },
  });

  await setSessionCookie({ uid: user.id, email: user.email, name: user.name });
  return NextResponse.json({ ok: true, user });
}

