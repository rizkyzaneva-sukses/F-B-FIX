import { apiError } from "@/lib/api-response";
import { readSession } from "@/lib/auth";
import { adminToken } from "@/lib/postgrest";

/**
 * Require admin-level access.
 * In production, use a separate admin role or superuser check.
 * For now, we check for a specific admin email pattern or env var.
 */
export async function requireAdmin() {
  const session = await readSession();
  if (!session) {
    return { error: apiError("Sesi login diperlukan.", 401, "UNAUTHENTICATED") } as const;
  }

  // Check if user is admin (by email whitelist or role)
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  const userEmail = session.email?.toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    return { error: apiError("Akses admin diperlukan.", 403, "FORBIDDEN") } as const;
  }

  // Admin panel reads across every business, so it runs with the service token.
  const token = await adminToken();
  return { session, token } as { session: typeof session; token: string };
}
