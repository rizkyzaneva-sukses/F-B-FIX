import type { NextConfig } from "next";

/**
 * Midtrans Snap is injected as a third-party script on the pricing page, so its host is
 * allowed for scripts and frames. Everything else stays same-origin.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://app.midtrans.com https://app.sandbox.midtrans.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.midtrans.com https://api.sandbox.midtrans.com",
  "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Only meaningful over HTTPS; harmless on plain HTTP during local dev.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
