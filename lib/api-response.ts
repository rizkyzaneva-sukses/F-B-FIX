const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export function apiData<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status, headers: NO_STORE });
}
export function apiError(message: string, status = 500, code = "INTERNAL_ERROR") {
  return Response.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}
export function statusFromError(error: unknown) { const value = error as { status?: number; message?: string }; return { status: value.status || 500, message: value.message || "Terjadi kesalahan pada server." }; }
