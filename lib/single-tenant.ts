/**
 * Satu flag env mengendalikan mode klon (1 app = 1 toko).
 * True untuk: "true", "1", "yes" (case-insensitive).
 */
export function isSingleTenant(): boolean {
  const value = (
    process.env.SINGLE_TENANT ||
    process.env.NEXT_PUBLIC_SINGLE_TENANT ||
    ""
  )
    .trim()
    .toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export const SINGLE_TENANT_BLOCKED_PAGES = ["/register", "/pricing", "/admin"] as const;

export const SINGLE_TENANT_BLOCKED_API_PREFIXES = [
  "/api/auth/register",
  "/api/subscription",
  "/api/admin",
] as const;

export function isSingleTenantBlockedPath(pathname: string): boolean {
  if (SINGLE_TENANT_BLOCKED_PAGES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return true;
  }
  return SINGLE_TENANT_BLOCKED_API_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
