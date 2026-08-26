import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const body = await request.json() as { amount?: number; payment_method?: string; payment_proof_url?: string }; if (!body.amount || body.amount <= 0) return apiError("Nominal pembayaran harus lebih dari 0.", 422, "VALIDATION_ERROR"); const result = await postgrestJson(`/rpc/pay_receivable`, { method: "POST", body: JSON.stringify({ p_receivable_id: (await context.params).id, p_amount: body.amount, p_method: body.payment_method || "TUNAI", p_payment_proof_url: body.payment_proof_url || null }) }, auth.token); return apiData(result); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Pembayaran piutang gagal.", 422, "RECEIVABLE_PAYMENT_FAILED"); }
}
