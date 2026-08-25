import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const { id } = await context.params;
    const body = await request.json() as { amount?: number; payment_method?: string; notes?: string };
    if (!body.amount || body.amount <= 0) return apiError("Nominal pembayaran harus lebih dari 0.", 422, "VALIDATION_ERROR");
    const result = await postgrestJson("/rpc/pay_invoice", {
      method: "POST",
      body: JSON.stringify({
        p_invoice_id: id,
        p_amount: body.amount,
        p_method: body.payment_method || "TUNAI",
        p_notes: body.notes || "",
      }),
    }, auth.token);
    return apiData(result);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Pembayaran invoice gagal.", 422, "PAYMENT_FAILED");
  }
}
