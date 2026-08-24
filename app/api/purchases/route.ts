import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const payload = await request.json() as Record<string, unknown>; if (!payload.supplier_id && payload.supplier_name) { const suppliers = await postgrestJson<Array<{ id: string }>>(`/parties?party_type=eq.SUPPLIER&name=eq.${encodeURIComponent(String(payload.supplier_name))}&select=id`, {}, auth.token); payload.supplier_id = suppliers[0]?.id; if (!payload.supplier_id) { const created = await postgrestJson<Array<{ id: string }>>("/parties?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ business_id: auth.session.business_id, party_type: "SUPPLIER", name: String(payload.supplier_name), phone: "", address: "" }) }, auth.token); payload.supplier_id = created[0]?.id; } } return apiData(await postgrestJson("/rpc/create_purchase", { method: "POST", body: JSON.stringify({ p_payload: payload }) }, auth.token), 201); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Pembelian gagal disimpan.", 422, "PURCHASE_FAILED"); }
}
