import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/reset-password",
  "/pricing",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/cashier-login",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/reset-password",
  "/api/webhooks/",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export function middleware(request: NextRequest) {
  // Skip if backend is not enabled (demo mode)
  if (process.env.NEXT_PUBLIC_BACKEND_ENABLED !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icon.svg") ||
    pathname.startsWith("/manifest.webmanifest") ||
    pathname.startsWith("/sw.js")
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  if (!request.cookies.has("dk_session")) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Sesi login diperlukan." } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
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
