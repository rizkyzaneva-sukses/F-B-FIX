/**
 * Email sending abstraction.
 * Replace with Resend, SendGrid, or AWS SES in production.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER || "console";

  switch (provider) {
    case "resend":
      await sendViaResend(options);
      break;
    case "sendgrid":
      await sendViaSendGrid(options);
      break;
    default:
      // Console fallback for development
      console.log(`[EMAIL] To: ${options.to}\nSubject: ${options.subject}\n${options.html}`);
  }
}

async function sendViaResend(options: EmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY belum dikonfigurasi");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "DapurKasir <noreply@dapurkasir.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });
}

async function sendViaSendGrid(options: EmailOptions) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY belum dikonfigurasi");

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: process.env.EMAIL_FROM || "noreply@dapurkasir.com" },
      subject: options.subject,
      content: [{ type: "text/html", value: options.html }],
    }),
  });
}

export function verificationEmailHtml(name: string, link: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #047857;">Verifikasi Email DapurKasir</h2>
      <p>Halo ${name},</p>
      <p>Klik tombol di bawah untuk memverifikasi email kamu:</p>
      <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">Verifikasi Email</a>
      <p style="color: #64748b; font-size: 13px;">Link ini berlaku selama 24 jam. Jika kamu tidak mendaftar, abaikan email ini.</p>
    </div>
  `;
}

export function resetPasswordEmailHtml(name: string, link: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #047857;">Reset Password DapurKasir</h2>
      <p>Halo ${name},</p>
      <p>Klik tombol di bawah untuk reset password kamu:</p>
      <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">Reset Password</a>
      <p style="color: #64748b; font-size: 13px;">Link ini berlaku selama 1 jam. Jika kamu tidak meminta reset, abaikan email ini.</p>
    </div>
  `;
}
