import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "rb_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Fallback for dev only — generate a stable per-process key is unsafe across
    // restarts, so we warn loudly.
    console.warn(
      "[auth] SESSION_SECRET missing or too short (<32). Using insecure default. Set SESSION_SECRET in .env.",
    );
    return new TextEncoder().encode("insecure_dev_secret_change_me_in_env_file!!");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  uid: string;
  email: string;
  name: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    if (typeof payload.uid !== "string") return null;
    return {
      uid: payload.uid as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}