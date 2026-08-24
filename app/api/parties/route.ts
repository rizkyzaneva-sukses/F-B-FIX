import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const body = await request.json() as Record<string, unknown>; if (!body.name || !["SUPPLIER", "CUSTOMER"].includes(String(body.party_type)) || Number(body.credit_limit || 0) < 0) return apiError("Tipe pihak, nama, dan limit piutang wajib valid.", 422, "VALIDATION_ERROR"); const result = await postgrestJson("/parties?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...body, business_id: auth.session.business_id, name: String(body.name).trim() }) }, auth.token); return apiData(result, 201); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Pihak gagal disimpan.", 422, "PARTY_CREATE_FAILED"); }
}
