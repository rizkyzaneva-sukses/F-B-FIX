import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner, requireSession } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await requireSession(); if ("error" in auth) return auth.error;
  const url = new URL(request.url); const type = url.searchParams.get("type") === "raw" ? "RAW_MATERIAL" : "PRODUCT"; const search = url.searchParams.get("search") || "";
  try { return apiData(await postgrestJson(`/items?select=*,units(code,label)&item_type=eq.${type}&is_active=eq.true&name=ilike.*${encodeURIComponent(search)}*&order=name`, {}, auth.token)); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Gagal memuat item.", 502, "ITEMS_FAILED"); }
}

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const body = await request.json() as Record<string, unknown>; const type = body.item_type === "RAW_MATERIAL" ? "RAW_MATERIAL" : "PRODUCT";
    if (!String(body.name || "").trim() || (!body.unit_id && !body.unit_code) || Number(body.stock_qty || 0) < 0) return apiError("Nama, satuan, dan stok valid wajib diisi.", 422, "VALIDATION_ERROR");
    const unitId = body.unit_id || (await postgrestJson<Array<{ id: string }>>(`/units?code=eq.${encodeURIComponent(String(body.unit_code || ""))}&select=id`, {}, auth.token))[0]?.id;
    if (!unitId) return apiError("Satuan tidak ditemukan.", 422, "UNIT_NOT_FOUND");
    const { unit_code: _unitCode, ...cleanBody } = body;
    const rows = await postgrestJson(`/items?select=*`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...cleanBody, unit_id: unitId, business_id: auth.session.business_id, item_type: type, name: String(body.name).trim() }) }, auth.token);
    return apiData(rows, 201);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Gagal menyimpan item.", 422, "ITEM_CREATE_FAILED"); }
}
