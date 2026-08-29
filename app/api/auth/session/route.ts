import { apiData, apiError } from "@/lib/api-response";
import { readSession } from "@/lib/auth";
import { isSingleTenant } from "@/lib/single-tenant";

export async function GET() {
  const session = await readSession();
  if (!session) return apiError("Sesi tidak ditemukan.", 401, "UNAUTHENTICATED");
  return apiData({ ...session, single_tenant: isSingleTenant() });
}
