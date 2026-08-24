import bcrypt from "bcryptjs";
import crypto from "crypto";
import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { checkRateLimit } from "@/lib/rate-limit";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * POST: Request password reset (send email)
 * PUT: Reset password with token
 */

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email) return apiError("Email wajib diisi.", 422, "VALIDATION_ERROR");

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit password reset requests
    const limit = checkRateLimit(`reset-password:${normalizedEmail}`, 3, 60 * 60 * 1000); // 3 per hour
    if (!limit.allowed) {
      return apiError("Terlalu banyak permintaan reset. Coba lagi dalam 1 jam.", 429, "RATE_LIMITED");
    }

    // Find user (always return success to prevent email enumeration)
    const users = await postgrestJson<
      Array<{ id: string; business_id: string; name: string; email: string }>
    >(`/app_users?email=eq.${encodeURIComponent(normalizedEmail)}&is_active=eq.true&select=id,business_id,name,email`);

    if (!users[0]) {
      // Return success anyway to prevent email enumeration
      return apiData({ message: "Jika email terdaftar, link reset telah dikirim." });
    }

    const user = users[0];

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token
    await postgrestJson("/verification_tokens", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        business_id: user.business_id,
        token_hash: tokenHash,
        purpose: "password_reset",
        expires_at: expiresAt,
      }),
    });

    // Send email
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const { sendEmail, resetPasswordEmailHtml } = await import("@/lib/email");
    await sendEmail({
      to: normalizedEmail,
      subject: "Reset Password DapurKasir",
      html: resetPasswordEmailHtml(user.name, resetLink),
    });

    return apiData({ message: "Jika email terdaftar, link reset telah dikirim." });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memproses reset password.",
      500,
      "RESET_PASSWORD_FAILED"
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { token, password } = (await request.json()) as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return apiError("Token dan password baru wajib diisi.", 422, "VALIDATION_ERROR");
    }
    if (password.length < 8) {
      return apiError("Password minimal 8 karakter.", 422, "VALIDATION_ERROR");
    }

    const tokenHash = hashToken(token);
    const now = new Date().toISOString();

    // Find valid token
    const tokens = await postgrestJson<
      Array<{ id: string; user_id: string; expires_at: string }>
    >(
      `/verification_tokens?token_hash=eq.${tokenHash}&purpose=eq.password_reset&used_at=is.null&expires_at=gt.${now}&select=id,user_id,expires_at`
    );

    const tokenRecord = tokens[0];
    if (!tokenRecord) {
      return apiError("Token reset tidak valid atau sudah kedaluwarsa.", 400, "INVALID_TOKEN");
    }

    // Update password
    const passwordHash = await bcrypt.hash(password, 12);
    await postgrestJson(`/app_users?id=eq.${tokenRecord.user_id}`, {
      method: "PATCH",
      body: JSON.stringify({ password_hash: passwordHash }),
    });

    // Mark token as used
    await postgrestJson(`/verification_tokens?id=eq.${tokenRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({ used_at: now }),
    });

    return apiData({ message: "Password berhasil diubah. Silakan login." });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal reset password.",
      500,
      "RESET_PASSWORD_FAILED"
    );
  }
}
