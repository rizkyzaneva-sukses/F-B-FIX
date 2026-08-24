import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const body = await request.json() as { amount?: number; payment_method?: string }; if (!body.amount || body.amount <= 0) return apiError("Nominal pembayaran harus lebih dari 0.", 422, "VALIDATION_ERROR"); return apiData(await postgrestJson("/rpc/pay_payable", { method: "POST", body: JSON.stringify({ p_payable_id: (await context.params).id, p_amount: body.amount, p_method: body.payment_method || "TUNAI" }) }, auth.token)); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Pembayaran utang gagal.", 422, "PAYABLE_PAYMENT_FAILED"); }
}
