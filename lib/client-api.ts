/**
 * Thin fetch wrapper for the app's own API routes.
 *
 * Cross-site request forgery is handled by the Origin check in middleware.ts plus the
 * sameSite=lax session cookie — there is no CSRF token to attach here. An earlier
 * version fetched a token from /api/auth/csrf and sent it as X-CSRF-Token, but no
 * route ever validated it, so it only looked like protection.
 */
export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };

  const response = await fetch(path, { ...init, headers });
  const result = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(result?.error?.message || "Permintaan ke server gagal.");
  }
  return (result?.data ?? result) as T;
}
