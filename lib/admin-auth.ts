import { apiError } from "@/lib/api-response";
import { readSession, sessionToken } from "@/lib/auth";

/**
 * Require admin-level access.
 * In production, use a separate admin role or superuser check.
 * For now, we check for a specific admin email pattern or env var.
 */
export async function requireAdmin() {
  const [session, token] = await Promise.all([readSession(), sessionToken()]);
  if (!session || !token) {
    return { error: apiError("Sesi login diperlukan.", 401, "UNAUTHENTICATED") } as const;
  }

  // Check if user is admin (by email whitelist or role)
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  const userEmail = session.email?.toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    return { error: apiError("Akses admin diperlukan.", 403, "FORBIDDEN") } as const;
  }

  return { session, token } as { session: typeof session; token: string };
}
