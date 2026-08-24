import { apiError } from "@/lib/api-response";
import { readSession, type Session } from "@/lib/auth";
import { userToken } from "@/lib/postgrest";

export async function requireSession() {
  const session = await readSession();
  if (!session) return { error: apiError("Sesi login diperlukan.", 401, "UNAUTHENTICATED") } as const;
  // The session cookie is signed with SESSION_SECRET; PostgREST needs its own token.
  const token = await userToken(session);
  return { session, token } as { session: Session; token: string };
}

export async function requireOwner() {
  const auth = await requireSession();
  if ("error" in auth) return auth;
  if (auth.session.role !== "OWNER") return { error: apiError("Akses hanya untuk owner.", 403, "FORBIDDEN") } as const;
  return auth;
}
