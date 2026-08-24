import { SignJWT } from "jose";

function baseUrl() {
  const value = process.env.POSTGREST_URL;
  if (!value) throw new Error("POSTGREST_URL belum dikonfigurasi");
  return value.replace(/\/$/, "");
}

// Cache admin token until 30s before expiry
let cachedAdminToken: string | null = null;
let cachedAdminTokenExpiry = 0;

/**
 * Generate or return cached admin JWT for PostgREST.
 * Uses POSTGREST_JWT_SECRET (NOT session secret).
 */
async function adminToken(): Promise<string> {
  const now = Date.now();
  if (cachedAdminToken && now < cachedAdminTokenExpiry - 30_000) {
    return cachedAdminToken;
  }

  // Prefer explicit admin JWT from env
  if (process.env.POSTGREST_ADMIN_JWT) {
    cachedAdminToken = process.env.POSTGREST_ADMIN_JWT;
    cachedAdminTokenExpiry = now + 4 * 60 * 60 * 1000; // 4 hours
    return cachedAdminToken;
  }

  const secret = process.env.POSTGREST_JWT_SECRET;
  if (!secret) throw new Error("POSTGREST_JWT_SECRET belum dikonfigurasi");

  cachedAdminToken = await new SignJWT({
    role: "service_role",
    user_id: "00000000-0000-0000-0000-000000000000",
    business_id: "00000000-0000-0000-0000-000000000000",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));

  cachedAdminTokenExpiry = now + 5 * 60 * 1000;
  return cachedAdminToken;
}

export async function postgrest(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept-Profile", process.env.POSTGREST_SCHEMA || "public");
  headers.set("Content-Profile", process.env.POSTGREST_SCHEMA || "public");
  headers.set("Authorization", `Bearer ${token || (await adminToken())}`);
  return fetch(`${baseUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

export async function postgrestJson<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await postgrest(path, init, token);
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String(body.message)
        : `PostgREST error ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status, body });
  }
  return body as T;
}
