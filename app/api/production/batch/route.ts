import { apiData, apiError, statusFromError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const result = await postgrestJson("/rpc/create_production_batch", { method: "POST", body: JSON.stringify({ p_payload: await request.json() }) }, auth.token); return apiData(result, 201); }
  catch (error) { const detail = statusFromError(error); return apiError(detail.message, detail.status === 500 ? 409 : detail.status, "PRODUCTION_FAILED"); }
}
