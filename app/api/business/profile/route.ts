import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function PATCH(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const body = await request.json() as Record<string, unknown>; if (body.paper_width && ![58, 80].includes(Number(body.paper_width))) return apiError("Lebar kertas hanya 58 atau 80 mm.", 422, "VALIDATION_ERROR"); const result = await postgrestJson(`/businesses?id=eq.${auth.session.business_id}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: body.name, address: body.address, phone: body.phone, receipt_footer: body.receipt_footer, paper_width: body.paper_width }) }, auth.token); return apiData(result); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Profil usaha gagal diperbarui.", 422, "BUSINESS_UPDATE_FAILED"); }
}
