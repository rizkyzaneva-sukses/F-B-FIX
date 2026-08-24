import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET: List upgrade requests
 * PATCH: Approve/reject upgrade request
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "PENDING";
    const limit = Math.min(50, Number(url.searchParams.get("limit") || 20));

    const requests = await postgrestJson<Array<Record<string, unknown>>>(
      `/upgrade_requests?select=*,businesses(name,plan),app_users(name,email)&status=eq.${status}&order=created_at.desc&limit=${limit}`,
      {},
      auth.token
    );

    return apiData({ requests });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat permintaan upgrade.",
      502,
      "ADMIN_UPGRADES_FAILED"
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { requestId, action, notes } = body as {
      requestId?: string;
      action?: "approve" | "reject";
      notes?: string;
    };

    if (!requestId || !action) {
      return apiError("Request ID dan action wajib diisi.", 422, "VALIDATION_ERROR");
    }

    // Get the upgrade request
    const requests = await postgrestJson<Array<{
      id: string; business_id: string; plan: string; status: string;
    }>>(
      `/upgrade_requests?select=id,business_id,plan,status&id=eq.${requestId}`,
      {},
      auth.token
    );

    const upgradeRequest = requests[0];
    if (!upgradeRequest) {
      return apiError("Permintaan tidak ditemukan.", 404, "NOT_FOUND");
    }
    if (upgradeRequest.status !== "PENDING") {
      return apiError("Permintaan sudah diproses.", 409, "ALREADY_PROCESSED");
    }

    if (action === "approve") {
      // Upgrade business to PRO
      await postgrestJson(
        `/businesses?id=eq.${upgradeRequest.business_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ plan: "PRO" }),
        },
        auth.token
      );

      // Create subscription record
      await postgrestJson(
        "/subscriptions",
        {
          method: "POST",
          body: JSON.stringify({
            business_id: upgradeRequest.business_id,
            plan: "PRO",
            status: "ACTIVE",
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            payment_gateway: "manual",
          }),
        },
        auth.token
      );
    }

    // Update request status
    await postgrestJson(
      `/upgrade_requests?id=eq.${requestId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: action === "approve" ? "APPROVED" : "REJECTED",
          notes: notes || "",
          reviewed_by: auth.session.user_id,
          reviewed_at: new Date().toISOString(),
        }),
      },
      auth.token
    );

    return apiData({
      status: action === "approve" ? "APPROVED" : "REJECTED",
      message: action === "approve" ? "Bisnis berhasil diupgrade ke PRO." : "Permintaan upgrade ditolak.",
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memproses permintaan.",
      500,
      "ADMIN_UPGRADE_FAILED"
    );
  }
}
