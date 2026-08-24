import { apiData, apiError, statusFromError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";

export async function POST(request: Request) {
  const auth = await requireSession(); if ("error" in auth) return auth.error;
  try { const payload = await request.json() as Record<string, unknown>; if (payload.payment_method === "HUTANG" && !payload.party_id && payload.customer_name) { const parties = await postgrestJson<Array<{ id: string }>>(`/parties?party_type=eq.CUSTOMER&name=eq.${encodeURIComponent(String(payload.customer_name))}&select=id`, {}, auth.token); payload.party_id = parties[0]?.id; } const result = await postgrestJson("/rpc/checkout_pos", { method: "POST", body: JSON.stringify({ p_payload: payload }) }, auth.token); return apiData(result, 201); }
  catch (error) { const detail = statusFromError(error); return apiError(detail.message, detail.status === 500 ? 409 : detail.status, "CHECKOUT_FAILED"); }
}
