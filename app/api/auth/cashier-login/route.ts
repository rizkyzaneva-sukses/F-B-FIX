import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { setSession } from "@/lib/auth";
import { postgrestJson } from "@/lib/postgrest";
import { checkRateLimit, resetRateLimit, clientIp } from "@/lib/rate-limit";

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const { business_id, pin } = await request.json() as { business_id?: string; pin?: string };
    if (!business_id || !/^\d{6}$/.test(pin || "")) {
      return apiError("Business ID dan PIN 6 digit wajib diisi.", 422, "VALIDATION_ERROR");
    }

    // Keyed on business + caller IP. Keying on business alone let anyone lock every
    // cashier of a store out for 15 minutes with five wrong PINs.
    const rateLimitKey = `cashier-login:${business_id}:${clientIp(request)}`;
    const limit = checkRateLimit(rateLimitKey, MAX_PIN_ATTEMPTS, LOCKOUT_MS);
    if (!limit.allowed) {
      const retryMinutes = Math.ceil(limit.retryAfterMs / 60000);
      return apiError(
        `Terlalu banyak percobaan PIN. Coba lagi dalam ${retryMinutes} menit.`,
        429,
        "RATE_LIMITED"
      );
    }

    const rows = await postgrestJson<Array<{
      id: string; business_id: string; name: string;
      pin_hash: string; role: "KASIR"; is_active: boolean;
    }>>(
      `/app_users?business_id=eq.${business_id}&role=eq.KASIR&is_active=eq.true&select=id,business_id,name,pin_hash,role,is_active`,
      {},
      undefined // use admin token to query, then validate PIN server-side
    );

    const validPin = pin || "";
    // Use timing-safe comparison to prevent timing attacks
    let matchedUser: typeof rows[0] | undefined;
    for (const candidate of rows) {
      if (!candidate.pin_hash) continue;
      try {
        const isValid = await bcrypt.compare(validPin, candidate.pin_hash);
        if (isValid) {
          matchedUser = candidate;
          break;
        }
      } catch {
        // Skip invalid hash
      }
    }

    if (!matchedUser) {
      return apiError(
        `PIN kasir tidak valid. Sisa percobaan: ${limit.remaining - 1}`,
        401,
        "INVALID_PIN"
      );
    }

    // Successful login — reset rate limit
    resetRateLimit(rateLimitKey);

    await setSession({
      user_id: matchedUser.id,
      business_id: matchedUser.business_id,
      role: "KASIR",
      name: matchedUser.name,
    });

    return apiData({
      user_id: matchedUser.id,
      business_id: matchedUser.business_id,
      name: matchedUser.name,
      role: matchedUser.role,
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Login kasir gagal.", 500, "CASHIER_LOGIN_FAILED");
  }
}
