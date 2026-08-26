import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner, requireSession } from "@/lib/route-auth";
import { assertCanAddStaff } from "@/lib/plan-limits";
import type { UserRole } from "@/lib/types";

/**
 * GET: List all staff / cashiers for the business
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const cashiers = await postgrestJson<
      Array<{ id: string; name: string; role: UserRole; is_active: boolean; created_at: string }>
    >(
      `/app_users?select=id,name,role,is_active,created_at&business_id=eq.${auth.session.business_id}&role=neq.OWNER&order=name`,
      {},
      auth.token
    );

    return apiData(cashiers);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat daftar staff.",
      502,
      "CASHIERS_FAILED"
    );
  }
}

/**
 * POST: Create a new staff / cashier
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as {
      name?: string;
      pin?: string;
      role?: "KASIR" | "GUDANG" | "FINANCE";
    };

    const targetRole = body.role || "KASIR";
    if (!body.name?.trim() || !/^\d{6}$/.test(body.pin || "")) {
      return apiError("Nama dan PIN numerik 6 digit wajib diisi.", 422, "VALIDATION_ERROR");
    }

    if (!["KASIR", "GUDANG", "FINANCE"].includes(targetRole)) {
      return apiError("Role tidak valid.", 422, "INVALID_ROLE");
    }

    // Check Plan Limits (Free: 1 Kasir only; PRO: multi-role staff)
    await assertCanAddStaff(auth.session.business_id, targetRole, auth.token);

    const result = await postgrestJson(
      "/app_users?select=id,name,role,is_active",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          business_id: auth.session.business_id,
          name: body.name.trim(),
          pin_hash: await bcrypt.hash(body.pin!, 12),
          role: targetRole,
          is_active: true,
        }),
      },
      auth.token
    );

    return apiData(result, 201);
  } catch (error: any) {
    return apiError(
      error instanceof Error ? error.message : "Staff gagal dibuat.",
      error?.status || 422,
      "STAFF_CREATE_FAILED"
    );
  }
}

