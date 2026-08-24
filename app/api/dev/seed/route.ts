import { apiData, apiError } from "@/lib/api-response";
import { requireOwner } from "@/lib/route-auth";
import { seedBusinessData, trialToolsEnabled } from "@/lib/dev-tools";

/**
 * POST /api/dev/seed — isi bisnis ini dengan data dummy siap pakai.
 * Data lama dihapus dulu supaya tombol bisa ditekan berulang kali.
 */
export async function POST() {
  if (!trialToolsEnabled()) {
    return apiError("Fitur trial sudah dinonaktifkan.", 403, "TRIAL_TOOLS_DISABLED");
  }

  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const summary = await seedBusinessData(auth.session.business_id, auth.session.user_id);
    return apiData(summary, 201);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal membuat data dummy.",
      502,
      "SEED_FAILED"
    );
  }
}
