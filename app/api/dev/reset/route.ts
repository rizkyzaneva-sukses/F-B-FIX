import { apiData, apiError } from "@/lib/api-response";
import { requireOwner } from "@/lib/route-auth";
import { resetBusinessData, trialToolsEnabled } from "@/lib/dev-tools";

/**
 * POST /api/dev/reset — hapus seluruh data operasional bisnis ini.
 * Bisnis, akun owner/kasir, satuan, dan langganan tetap dipertahankan.
 */
export async function POST() {
  if (!trialToolsEnabled()) {
    return apiError("Fitur trial sudah dinonaktifkan.", 403, "TRIAL_TOOLS_DISABLED");
  }

  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const deleted = await resetBusinessData(auth.session.business_id);
    const total = Object.values(deleted).reduce((sum, count) => sum + count, 0);
    return apiData({ deleted, total });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal menghapus data.",
      502,
      "RESET_FAILED"
    );
  }
}
