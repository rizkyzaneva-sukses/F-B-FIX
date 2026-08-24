export async function backendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
  const result = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(result?.error?.message || "Permintaan ke server gagal.");
  return (result?.data ?? result) as T;
}
