import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function GET() {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try {
    const data = await postgrestJson<unknown[]>("/rpc/get_aging_report", {
      method: "POST",
      body: JSON.stringify({}),
    }, auth.token);
    return apiData(data);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Gagal memuat aging report.", 500, "FETCH_FAILED");
  }
}
