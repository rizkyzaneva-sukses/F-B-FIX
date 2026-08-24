import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { setSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_REGISTRATIONS_PER_IP = 5;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
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

    // Rate limit registrations per email
    const limit = checkRateLimit(`register:${email}`, MAX_REGISTRATIONS_PER_IP, REGISTRATION_WINDOW_MS);
    if (!limit.allowed) {
      return apiError("Terlalu banyak pendaftaran. Coba lagi nanti.", 429, "RATE_LIMITED");
    }

    // Check if email already exists
    const existing = await postgrestJson<Array<{ id: string }>>(
      `/app_users?email=eq.${encodeURIComponent(email)}&select=id`
    );
    if (existing.length > 0) {
      return apiError("Email sudah terdaftar.", 422, "EMAIL_EXISTS");
    }

    // Create business
    const business = (
      await postgrestJson<Array<{ id: string; name: string }>>(
        "/businesses",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ name: businessName }),
        }
      )
    )[0];

    // Create owner user
    const user = (
      await postgrestJson<
        Array<{ id: string; business_id: string; name: string; role: "OWNER" }>
      >(
        "/app_users",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            business_id: business.id,
            email,
            name: body.name?.trim() || email.split("@")[0],
            password_hash: await bcrypt.hash(password, 12),
            role: "OWNER",
            email_verified: false,
          }),
        }
      )
    )[0];

    // Seed default units
    await postgrestJson("/rpc/seed_default_units", {
      method: "POST",
      body: JSON.stringify({ p_business_id: business.id }),
    });

    // Send verification email (fire-and-forget)
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    import("@/lib/email").then(({ sendEmail, verificationEmailHtml }) => {
      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      postgrestJson("/verification_tokens", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          business_id: business.id,
          token_hash: tokenHash,
          purpose: "email_verify",
          expires_at: expiresAt,
        }),
      })
        .then(() =>
          sendEmail({
            to: email,
            subject: "Verifikasi Email DapurKasir",
            html: verificationEmailHtml(
              user.name,
              `${appUrl}/api/auth/verify-email?token=${token}`
            ),
          })
        )
        .catch(() => undefined); // Don't fail registration if email fails
    });

    // Set session
    await setSession({
      user_id: user.id,
      business_id: user.business_id,
      role: "OWNER",
      name: user.name,
      email,
    });

    return apiData({ user_id: user.id, business_id: business.id }, 201);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Registrasi gagal.",
      500,
      "REGISTER_FAILED"
    );
  }
}
