import bcrypt from "bcryptjs";
import crypto from "crypto";
import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { setSession } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { isSingleTenant } from "@/lib/single-tenant";

const MAX_REGISTRATIONS_PER_IP = 5;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  if (isSingleTenant()) {
    return apiError("Tidak tersedia pada instalasi toko tunggal.", 404, "NOT_FOUND");
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      business_name?: string;
      name?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";
    const businessName = body.business_name?.trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return apiError("Format email tidak valid.", 422, "VALIDATION_ERROR");
    }
    if (password.length < 8) {
      return apiError("Password minimal 8 karakter.", 422, "VALIDATION_ERROR");
    }
    if (!businessName) {
      return apiError("Nama usaha wajib diisi.", 422, "VALIDATION_ERROR");
    }

    // Rate limit by IP — limiting per email lets one client register unlimited
    // businesses just by varying the address.
    const limit = checkRateLimit(
      `register:${clientIp(request)}`,
      MAX_REGISTRATIONS_PER_IP,
      REGISTRATION_WINDOW_MS
    );
    if (!limit.allowed) {
      return apiError("Terlalu banyak pendaftaran. Coba lagi nanti.", 429, "RATE_LIMITED");
    }

    // One transaction: business + owner + default units. Previously these were three
    // separate calls, so a failure partway left an orphan business row behind.
    let created: { business_id: string; user_id: string };
    try {
      created = await postgrestJson<{ business_id: string; user_id: string }>("/rpc/register_business", {
        method: "POST",
        body: JSON.stringify({
          p_business_name: businessName,
          p_email: email,
          p_name: body.name?.trim() || "",
          p_password_hash: await bcrypt.hash(password, 12),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("sudah terdaftar")) {
        return apiError("Email sudah terdaftar.", 422, "EMAIL_EXISTS");
      }
      if (message.includes("hanya untuk satu toko")) {
        return apiError(message, 409, "SINGLE_TENANT");
      }
      throw error;
    }

    const displayName = body.name?.trim() || email.split("@")[0];

    // Send verification email without blocking signup, but never swallow the reason.
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    void (async () => {
      try {
        const { sendEmail, verificationEmailHtml } = await import("@/lib/email");
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await postgrestJson("/verification_tokens", {
          method: "POST",
          body: JSON.stringify({
            user_id: created.user_id,
            business_id: created.business_id,
            token_hash: tokenHash,
            purpose: "email_verify",
            expires_at: expiresAt,
          }),
        });

        await sendEmail({
          to: email,
          subject: "Verifikasi Email DapurKasir",
          html: verificationEmailHtml(displayName, `${appUrl}/api/auth/verify-email?token=${token}`),
        });
      } catch (error) {
        console.error("[register] verification email failed:", error);
      }
    })();

    await setSession({
      user_id: created.user_id,
      business_id: created.business_id,
      role: "OWNER",
      name: displayName,
      email,
    });

    return apiData({ user_id: created.user_id, business_id: created.business_id }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registrasi gagal.";
    const isNetworkError = message.includes("Tidak bisa terhubung") || message.includes("fetch failed");
    return apiError(
      isNetworkError
        ? "Server sedang tidak tersedia. Silakan coba lagi dalam beberapa saat."
        : message,
      isNetworkError ? 503 : 500,
      isNetworkError ? "SERVICE_UNAVAILABLE" : "REGISTER_FAILED"
    );
  }
}
