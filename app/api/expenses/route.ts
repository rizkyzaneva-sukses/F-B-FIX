import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const body = await request.json() as Record<string, unknown>; if (!body.category || Number(body.amount || 0) <= 0 || !body.expense_date) return apiError("Kategori, nominal, dan tanggal wajib valid.", 422, "VALIDATION_ERROR"); const result = await postgrestJson("/expenses?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...body, expense_type: body.expense_type || "OPERATING", business_id: auth.session.business_id, created_by: auth.session.user_id }) }, auth.token); return apiData(result, 201); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Pengeluaran gagal disimpan.", 422, "EXPENSE_FAILED"); }
}
