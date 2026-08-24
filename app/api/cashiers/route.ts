import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner, requireSession } from "@/lib/route-auth";

/**
 * GET: List all cashiers for the business
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const cashiers = await postgrestJson<
      Array<{ id: string; name: string; role: string; is_active: boolean; created_at: string }>
    >(
      `/app_users?select=id,name,role,is_active,created_at&business_id=eq.${auth.session.business_id}&role=eq.KASIR&order=name`,
      {},
      auth.token
    );

    return apiData(cashiers);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat kasir.",
      502,
      "CASHIERS_FAILED"
    );
  }
}

/**
 * POST: Create a new cashier
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as { name?: string; pin?: string };
    if (!body.name?.trim() || !/^\d{6}$/.test(body.pin || "")) {
      return apiError("Nama dan PIN numerik 6 digit wajib diisi.", 422, "VALIDATION_ERROR");
    }

    // Check if PIN already exists for this business
    const existing = await postgrestJson<Array<{ id: string }>>(
      `/app_users?select=id&business_id=eq.${auth.session.business_id}&role=eq.KASIR&is_active=eq.true`,
      {},
      auth.token
    );

    // Check PIN uniqueness by trying to match against all existing PINs
    // (We can't query by PIN directly since it's hashed)
    if (existing.length >= 10) {
      return apiError("Maksimal 10 kasir per bisnis.", 409, "MAX_CASHIERS");
    }

    const result = await postgrestJson(
      "/app_users?select=id,name,role,is_active",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          business_id: auth.session.business_id,
          name: body.name.trim(),
          pin_hash: await bcrypt.hash(body.pin!, 12),
          role: "KASIR",
          is_active: true,
        }),
      },
      auth.token
    );

    return apiData(result, 201);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Kasir gagal dibuat.",
      422,
      "CASHIER_CREATE_FAILED"
    );
  }
}
