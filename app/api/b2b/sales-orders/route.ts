import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let query = `/sales_orders?business_id=eq.${auth.session.business_id}&select=*,parties!customer_id(name,phone),sales_order_items(*,items(name,unit_id,units(code)))&order=created_at.desc`;
    if (status) query += `&status=eq.${status}`;
    const data = await postgrestJson<unknown[]>(query, {}, auth.token);
    return apiData(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal memuat sales order.", 500, "FETCH_FAILED");
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (!payload.customer_id && payload.customer_name) {
      const customers = await postgrestJson<Array<{ id: string }>>(
        `/parties?party_type=eq.CUSTOMER&name=eq.${encodeURIComponent(String(payload.customer_name))}&select=id`,
        {}, auth.token
      );
      payload.customer_id = customers[0]?.id;
      if (!payload.customer_id) {
        const created = await postgrestJson<Array<{ id: string }>>("/parties?select=id", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            business_id: auth.session.business_id,
            party_type: "CUSTOMER",
            name: String(payload.customer_name),
            phone: "",
            address: "",
          }),
        }, auth.token);
        payload.customer_id = created[0]?.id;
      }
    }
    const result = await postgrestJson("/rpc/create_sales_order", {
      method: "POST",
      body: JSON.stringify({ p_payload: payload }),
    }, auth.token);
    return apiData(result, 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal membuat sales order.", 422, "CREATE_FAILED");
  }
}
