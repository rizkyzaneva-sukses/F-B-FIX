import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const { id } = await context.params;
    const data = await postgrestJson<unknown[]>(
      `/invoices?id=eq.${id}&business_id=eq.${auth.session.business_id}&select=*,sales_orders(order_date,payment_terms_days,parties!customer_id(name,phone,address)),delivery_orders(delivery_date),invoice_payments(*)`,
      {}, auth.token
    );
    if (!data.length) return apiError("Invoice tidak ditemukan.", 404, "NOT_FOUND");
    return apiData(data[0]);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal memuat invoice.", 500, "FETCH_FAILED");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const { id } = await context.params;
    const body = await request.json() as { status?: string; notes?: string };
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    await postgrestJson(`/invoices?id=eq.${id}&business_id=eq.${auth.session.business_id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }, auth.token);
    return apiData({ id, ...updates });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal update invoice.", 422, "UPDATE_FAILED");
  }
}
