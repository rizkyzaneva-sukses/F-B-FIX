import crypto from "crypto";

const CSRF_SECRET = process.env.SESSION_SECRET || process.env.POSTGREST_JWT_SECRET || "fallback-csrf-secret";

/**
 * Generate a CSRF token for a session.
 */
export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const hash = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(`${sessionId}:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${hash}`;
}

/**
 * Validate a CSRF token.
 * Tokens expire after 24 hours.
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  try {
    const [timestamp, hash] = token.split(".");
    if (!timestamp || !hash) return false;

    // Check expiry (24 hours)
    const tokenTime = parseInt(timestamp, 36);
    if (Date.now() - tokenTime > 24 * 60 * 60 * 1000) return false;

    const expectedHash = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(`${sessionId}:${timestamp}`)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}
