import { apiData, apiError, statusFromError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/subscription/coupon — activate a plan with a coupon code instead of paying.
 *
 * All validation (active, not expired, quota left, not already redeemed by this
 * business) happens inside the redeem_coupon function so it stays atomic under
 * concurrent requests.
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  // Coupon codes are guessable by design, so cap how fast one caller can try them.
  const limit = checkRateLimit(`coupon:${clientIp(request)}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.allowed) {
    return apiError("Terlalu banyak percobaan kode. Coba lagi nanti.", 429, "RATE_LIMITED");
  }

  try {
    const body = (await request.json()) as { code?: string };
    const code = String(body.code || "").trim();
    if (!code) return apiError("Kode kupon wajib diisi.", 422, "VALIDATION_ERROR");

    const result = await postgrestJson<{ plan: string; expires_at: string | null }>(
      "/rpc/redeem_coupon",
      { method: "POST", body: JSON.stringify({ p_code: code }) },
      auth.token
    );

    return apiData({
      plan: result.plan,
      expiresAt: result.expires_at,
      message:
        result.expires_at
          ? `Paket ${result.plan} aktif sampai ${new Date(result.expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}.`
          : `Paket ${result.plan} aktif tanpa batas waktu.`,
    });
  } catch (error) {
    const detail = statusFromError(error);
    // The RPC raises business-rule errors; surface its message rather than a generic 500.
    return apiError(detail.message, detail.status === 500 ? 422 : detail.status, "COUPON_FAILED");
  }
}
