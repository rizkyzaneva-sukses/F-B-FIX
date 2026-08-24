/**
 * Simple in-memory rate limiter.
 * For production, use Redis-backed rate limiting (e.g., @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., "cashier-login:businessId:ip")
 * @param maxAttempts - Maximum attempts in the window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count, retryAfterMs: 0 };
}

/**
 * Reset rate limit for a given key (e.g., after successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Best-effort client IP for rate-limit keys.
 *
 * Behind EasyPanel/Traefik the real address arrives in x-forwarded-for; the first
 * entry is the client, the rest are proxies. Only trust this for rate limiting —
 * a direct caller can forge the header, so it must never gate authorisation.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
