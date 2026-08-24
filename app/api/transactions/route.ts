import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await requireSession(); if ("error" in auth) return auth.error;
  try { const url = new URL(request.url); const filters = [`select=*,parties(name),app_users(name)`, `order=occurred_at.desc`, `limit=${Math.min(100, Number(url.searchParams.get("limit") || 50))}`]; const from = url.searchParams.get("dateFrom"); const to = url.searchParams.get("dateTo"); if (from) filters.push(`occurred_at=gte.${from}T00:00:00`); if (to) filters.push(`occurred_at=lte.${to}T23:59:59`); if (url.searchParams.get("status")) filters.push(`payment_status=eq.${url.searchParams.get("status")}`); if (url.searchParams.get("method")) filters.push(`payment_method=eq.${url.searchParams.get("method")}`); if (auth.session.role === "KASIR") { filters.push(`created_by=eq.${auth.session.user_id}`); const today = new Date().toISOString().slice(0, 10); filters.push(`occurred_at=gte.${today}T00:00:00`, `occurred_at=lte.${today}T23:59:59`); } return apiData(await postgrestJson(`/transactions?${filters.join("&")}`, {}, auth.token)); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Riwayat transaksi gagal dimuat.", 502, "TRANSACTIONS_FAILED"); }
}
