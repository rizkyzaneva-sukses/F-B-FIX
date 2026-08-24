import { apiError } from "@/lib/api-response";
import { readSession, sessionToken, type Session } from "@/lib/auth";

export async function requireSession() {
  const [session, token] = await Promise.all([readSession(), sessionToken()]);
  if (!session || !token) return { error: apiError("Sesi login diperlukan.", 401, "UNAUTHENTICATED") } as const;
  return { session, token } as { session: Session; token: string };
}

export async function requireOwner() {
  const auth = await requireSession();
  if ("error" in auth) return auth;
  if (auth.session.role !== "OWNER") return { error: apiError("Akses hanya untuk owner.", 403, "FORBIDDEN") } as const;
  return auth;
}
