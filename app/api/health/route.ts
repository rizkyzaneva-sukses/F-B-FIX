import { apiData } from "@/lib/api-response";
import { postgrestCount, postgrestJson } from "@/lib/postgrest";
import { isSingleTenant } from "@/lib/single-tenant";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload: {
    status: "ok" | "degraded";
    version: string;
    single_tenant: boolean;
    time: string;
    db: "ok" | "error";
    last_migration: string | null;
    business_count: number | null;
    db_error?: string;
  } = {
    status: "ok",
    version: APP_VERSION,
    single_tenant: isSingleTenant(),
    time: new Date().toISOString(),
    db: "ok",
    last_migration: null,
    business_count: null,
  };

  try {
    const [latest, businessCount] = await Promise.all([
      postgrestJson<Array<{ filename: string; applied_at: string }>>(
        "/schema_migrations?select=filename,applied_at&order=filename.desc&limit=1"
      ),
      postgrestCount("/businesses"),
    ]);
    payload.last_migration = latest[0]?.filename ?? null;
    payload.business_count = businessCount;
  } catch (error) {
    payload.status = "degraded";
    payload.db = "error";
    payload.db_error = error instanceof Error ? error.message : "Database tidak terjangkau.";
  }

  return apiData(payload, payload.status === "ok" ? 200 : 503);
}
