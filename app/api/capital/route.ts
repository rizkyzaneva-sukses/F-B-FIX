import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";
export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const body = await request.json() as Record<string, unknown>; const amount = Number(body.amount || 0); if (!['INITIAL','ADDITION','WITHDRAWAL'].includes(String(body.entry_type)) || amount <= 0 || !body.entry_date) return apiError("Jenis, nominal, dan tanggal modal wajib valid.", 422, "VALIDATION_ERROR"); return apiData(await postgrestJson("/capital_entries?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ business_id: auth.session.business_id, entry_type: body.entry_type, amount, entry_date: body.entry_date, notes: body.notes || '', created_by: auth.session.user_id }) }, auth.token), 201); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Modal gagal disimpan.", 422, "CAPITAL_FAILED"); }
}
