import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { setSession } from "@/lib/auth";
import { postgrestJson } from "@/lib/postgrest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const MAX_LOGIN_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };
    if (!email || !password) return apiError("Email dan password wajib diisi.", 422, "VALIDATION_ERROR");

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit per email
    const rateLimitKey = `owner-login:${normalizedEmail}`;
    const limit = checkRateLimit(rateLimitKey, MAX_LOGIN_ATTEMPTS, LOCKOUT_MS);
    if (!limit.allowed) {
      const retryMinutes = Math.ceil(limit.retryAfterMs / 60000);
      return apiError(
        `Terlalu banyak percobaan login. Coba lagi dalam ${retryMinutes} menit.`,
        429,
        "RATE_LIMITED"
      );
    }

    const rows = await postgrestJson<Array<{
      id: string; business_id: string; name: string;
      email: string; password_hash: string;
      role: "OWNER" | "KASIR"; is_active: boolean;
    }>>(
      `/app_users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,business_id,name,email,password_hash,role,is_active`
    );

    const user = rows[0];
    if (!user || !user.is_active || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return apiError(
        `Email atau password salah. Sisa percobaan: ${limit.remaining - 1}`,
        401,
        "INVALID_CREDENTIALS"
      );
    }

    // Successful login — reset rate limit
    resetRateLimit(rateLimitKey);

    await setSession({
      user_id: user.id,
      business_id: user.business_id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return apiData({ user_id: user.id, business_id: user.business_id, role: user.role });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Login gagal.", 500, "LOGIN_FAILED");
  }
}
