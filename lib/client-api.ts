let cachedCsrfToken: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const response = await fetch("/api/auth/csrf");
    if (response.ok) {
      const data = await response.json();
      cachedCsrfToken = data.data?.csrf_token || null;
    }
  } catch {
    // Ignore CSRF fetch errors in demo mode
  }
  return cachedCsrfToken;
}

export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> || {}),
  };

  // Add CSRF token for state-changing requests
  if (init.method && ["POST", "PUT", "PATCH", "DELETE"].includes(init.method.toUpperCase())) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

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
