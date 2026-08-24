import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";

export async function GET() {
  const auth = await requireSession(); if ("error" in auth) return auth.error;
  try { return apiData(await postgrestJson("/units?select=id,code,label,is_locked&order=code", {}, auth.token)); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Satuan gagal dimuat.", 502, "UNITS_FAILED"); }
}
