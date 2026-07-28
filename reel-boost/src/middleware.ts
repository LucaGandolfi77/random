import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";

const PUBLIC_PATHS = ["/", "/login", "/register", "/explore"];
const PUBLIC_API = ["/api/feed", "/api/categories", "/api/videos", "/api/views", "/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public API routes (GET feed without auth is fine).
  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    // Other APIs require a session — but we let the route handler respond 401
    // (handlers read the cookie via cookies()). Just continue.
    return NextResponse.next();
  }

  // Authed pages
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  const isAuthed = !!session;

  if (pathname === "/login" || pathname === "/register") {
    if (isAuthed) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/explore")) {
    return NextResponse.next();
  }

  // /onboarding, /upload, /wallet, /dashboard require auth
  if (!isAuthed) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)"],
};