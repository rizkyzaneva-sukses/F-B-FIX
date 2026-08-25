import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let query = `/invoices?business_id=eq.${auth.session.business_id}&select=*,sales_orders(order_date,parties!customer_id(name,phone)),delivery_orders(delivery_date)&order=created_at.desc`;
    if (status) query += `&status=eq.${status}`;
    const data = await postgrestJson<unknown[]>(query, {}, auth.token);
    return apiData(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal memuat invoice.", 500, "FETCH_FAILED");
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (!payload.sales_order_id) return apiError("Sales order wajib dipilih.", 422, "VALIDATION_ERROR");
    const result = await postgrestJson("/rpc/create_invoice", {
      method: "POST",
      body: JSON.stringify({ p_payload: payload }),
    }, auth.token);
    return apiData(result, 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal membuat invoice.", 422, "CREATE_FAILED");
  }
}
