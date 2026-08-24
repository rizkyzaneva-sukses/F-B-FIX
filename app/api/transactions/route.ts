import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";
import { dayEndExclusive, dayStart, isIsoDate, pickEnum, today } from "@/lib/query";

const PAYMENT_STATUSES = ["LUNAS", "SEBAGIAN", "BELUM_LUNAS"] as const;
const PAYMENT_METHODS = ["TUNAI", "QRIS", "TRANSFER", "HUTANG"] as const;

export async function GET(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const filters = [
      `select=*,parties(name),app_users(name)`,
      `order=occurred_at.desc`,
      `limit=${limit}`,
    ];

    // Only well-formed values reach the query string — a raw param could otherwise
    // append its own PostgREST filters.
    const from = url.searchParams.get("dateFrom");
    const to = url.searchParams.get("dateTo");
    if (isIsoDate(from)) filters.push(`occurred_at=gte.${dayStart(from)}`);
    if (isIsoDate(to)) filters.push(`occurred_at=lt.${dayEndExclusive(to)}`);

    const status = pickEnum(url.searchParams.get("status"), PAYMENT_STATUSES);
    const method = pickEnum(url.searchParams.get("method"), PAYMENT_METHODS);
    if (status) filters.push(`payment_status=eq.${status}`);
    if (method) filters.push(`payment_method=eq.${method}`);

    // KASIR can ONLY see their own transactions from today — enforced server-side
    if (auth.session.role === "KASIR") {
      const day = today();
      filters.push(`created_by=eq.${auth.session.user_id}`);
      filters.push(`occurred_at=gte.${dayStart(day)}`);
      filters.push(`occurred_at=lt.${dayEndExclusive(day)}`);
    }

    return apiData(await postgrestJson(`/transactions?${filters.join("&")}`, {}, auth.token));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Riwayat transaksi gagal dimuat.", 502, "TRANSACTIONS_FAILED");
  }
}
