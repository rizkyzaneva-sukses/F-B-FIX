import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const url = new URL(request.url);
    const soId = url.searchParams.get("sales_order_id");
    let query = `/delivery_orders?business_id=eq.${auth.session.business_id}&select=*,sales_orders(order_date,parties!customer_id(name)),delivery_order_items(*,items(name,units(code)))&order=created_at.desc`;
    if (soId) query += `&sales_order_id=eq.${soId}`;
    const data = await postgrestJson<unknown[]>(query, {}, auth.token);
    return apiData(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal memuat surat jalan.", 500, "FETCH_FAILED");
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (!payload.sales_order_id) return apiError("Sales order wajib dipilih.", 422, "VALIDATION_ERROR");
    const result = await postgrestJson("/rpc/create_delivery_order", {
      method: "POST",
      body: JSON.stringify({ p_payload: payload }),
    }, auth.token);
    return apiData(result, 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal membuat surat jalan.", 422, "CREATE_FAILED");
  }
}
