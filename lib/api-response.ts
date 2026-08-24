export function apiData<T>(data: T, status = 200) { return Response.json({ success: true, data }, { status }); }
export function apiError(message: string, status = 500, code = "INTERNAL_ERROR") { return Response.json({ success: false, error: { code, message } }, { status }); }
export function statusFromError(error: unknown) { const value = error as { status?: number; message?: string }; return { status: value.status || 500, message: value.message || "Terjadi kesalahan pada server." }; }
