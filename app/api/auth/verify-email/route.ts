import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * POST: Send verification email
 * GET: Verify email with token
 */

export async function POST(request: Request) {
  try {
    const { user_id, email, name } = (await request.json()) as {
      user_id?: string;
      email?: string;
      name?: string;
    };

    if (!user_id || !email) {
      return apiError("User ID dan email wajib diisi.", 422, "VALIDATION_ERROR");
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Get business_id
    const users = await postgrestJson<Array<{ business_id: string }>>(
      `/app_users?select=business_id&id=eq.${user_id}`,
      {}
    );
    if (!users[0]) return apiError("User tidak ditemukan.", 404, "USER_NOT_FOUND");

    // Store token
    await postgrestJson("/verification_tokens", {
      method: "POST",
      body: JSON.stringify({
        user_id,
        business_id: users[0].business_id,
        token_hash: tokenHash,
        purpose: "email_verify",
        expires_at: expiresAt,
      }),
    });

    // Send email
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const verifyLink = `${appUrl}/api/auth/verify-email?token=${token}`;

    const { sendEmail, verificationEmailHtml } = await import("@/lib/email");
    await sendEmail({
      to: email,
      subject: "Verifikasi Email DapurKasir",
      html: verificationEmailHtml(name || "User", verifyLink),
    });

    return apiData({ message: "Email verifikasi telah dikirim." });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal mengirim verifikasi.",
      500,
      "VERIFY_EMAIL_FAILED"
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) return apiError("Token verifikasi diperlukan.", 422, "VALIDATION_ERROR");

    const tokenHash = hashToken(token);
    const now = new Date().toISOString();

    // Find valid token
    const tokens = await postgrestJson<
      Array<{ id: string; user_id: string; expires_at: string; used_at: string | null }>
    >(
      `/verification_tokens?token_hash=eq.${tokenHash}&purpose=eq.email_verify&used_at=is.null&expires_at=gt.${now}&select=id,user_id,expires_at,used_at`,
      {}
    );

    const tokenRecord = tokens[0];
    if (!tokenRecord) {
      // Redirect to login with error
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?error=token_invalid" },
      });
    }

    // Mark user as verified
    await postgrestJson(
      `/app_users?id=eq.${tokenRecord.user_id}`,
      { method: "PATCH", body: JSON.stringify({ email_verified: true }) }
    );

    // Mark token as used
    await postgrestJson(
      `/verification_tokens?id=eq.${tokenRecord.id}`,
      { method: "PATCH", body: JSON.stringify({ used_at: now }) }
    );

    // Redirect to login with success
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?verified=true" },
    });
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=verify_failed" },
    });
  }
}
