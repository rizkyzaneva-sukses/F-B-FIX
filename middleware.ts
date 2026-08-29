import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import type { JWTPayload } from "jose";
import { isSingleTenant, isSingleTenantBlockedPath } from "@/lib/single-tenant";

// Pages and API routes reachable without a session.
const PUBLIC_ROUTES = [
  "/login",
  "/cashier-login",
  "/register",
  "/reset-password",
  "/pricing",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/cashier-login",
  "/api/auth/logout",
  "/api/health",
  "/api/auth/verify-email",
  "/api/auth/reset-password",
];

// Server-to-server callers: no session, no browser Origin. Authenticated by signature.
const WEBHOOK_PREFIX = "/api/webhooks/";

const STATIC_PATHS = ["/_next/", "/icon.svg", "/manifest.webmanifest", "/sw.js"];

function isPublicRoute(pathname: string): boolean {
  // Exact match or a real path segment below it — plain startsWith would also let
  // "/registerXYZ" through as public.
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function sessionSecret(): Uint8Array | null {
  const value = process.env.SESSION_SECRET || process.env.POSTGREST_JWT_SECRET;
  if (!value || value.length < 32) return null;
  return new TextEncoder().encode(value);
}

async function readSessionFrom(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get("dk_session")?.value;
  const secret = sessionSecret();
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Reject cross-site state-changing requests by checking where they came from.
 *
 * This replaces the old CSRF token endpoint, which minted tokens that no route ever
 * validated. Combined with the sameSite=lax session cookie, an Origin check is the
 * protection: browsers always send Origin on cross-origin mutating requests, so a
 * request either proves it came from our own page or it does not run.
 */
function isSameOrigin(request: NextRequest): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;

  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    return false;
  }

  // Accept the forwarded host too: behind a reverse proxy the browser's Origin carries
  // the public domain while `host` may be the internal one. Getting this wrong would
  // reject every write in production, so both spellings count.
  const candidates = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    process.env.APP_URL ? new URL(process.env.APP_URL).host : null,
  ].filter(Boolean) as string[];

  return candidates.includes(sourceHost);
}

export async function middleware(request: NextRequest) {
  // Skip if backend is not enabled (demo mode)
  if (process.env.NEXT_PUBLIC_BACKEND_ENABLED !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (isSingleTenant() && isSingleTenantBlockedPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Tidak tersedia pada instalasi toko tunggal.",
          },
        },
        { status: 404 }
      );
    }
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  const isWebhook = pathname.startsWith(WEBHOOK_PREFIX);
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);

  if (isMutation && !isWebhook && pathname.startsWith("/api/") && !isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, error: { code: "CROSS_ORIGIN_BLOCKED", message: "Permintaan lintas situs ditolak." } },
      { status: 403 }
    );
  }

  if (isWebhook || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const session = await readSessionFrom(request);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Sesi login diperlukan." } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin console: gate the page itself, not just its API routes, so the panel is not
  // reachable by every signed-in owner.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const email = typeof session.email === "string" ? session.email.toLowerCase() : "";
    if (!email || !adminEmails.includes(email)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
