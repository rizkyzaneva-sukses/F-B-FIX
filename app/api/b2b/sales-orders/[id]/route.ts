import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const { id } = await context.params;
    const data = await postgrestJson<unknown[]>(
      `/sales_orders?id=eq.${id}&business_id=eq.${auth.session.business_id}&select=*,parties!customer_id(name,phone,address),sales_order_items(*,items(name,unit_id,units(code)))`,
      {}, auth.token
    );
    if (!data.length) return apiError("Sales order tidak ditemukan.", 404, "NOT_FOUND");
    return apiData(data[0]);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal memuat sales order.", 500, "FETCH_FAILED");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const { id } = await context.params;
    const body = await request.json() as { status?: string };
    if (!body.status) return apiError("Status wajib diisi.", 422, "VALIDATION_ERROR");
    await postgrestJson("/rpc/update_so_status", {
      method: "POST",
      body: JSON.stringify({ p_so_id: id, p_status: body.status }),
    }, auth.token);
    return apiData({ id, status: body.status });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal update status.", 422, "UPDATE_FAILED");
  }
}
