import { SignJWT } from "jose/jwt/sign";

/**
 * Read a URL from env and tolerate the most common EasyPanel/dotenv mistake:
 * pasting the whole `NAMA=nilai` line into the value field, or wrapping it in quotes.
 * Without this, fetch() fails with "Failed to parse URL from POSTGREST_URL=http://...".
 */
export function envUrl(name: string): string {
  const raw = (process.env[name] || "").trim();
  if (!raw) throw new Error(`${name} belum dikonfigurasi`);

  let value = raw;
  // Strip repeated "NAMA=" prefixes (e.g. "POSTGREST_URL=POSTGREST_URL=http://...")
  while (value.toUpperCase().startsWith(`${name.toUpperCase()}=`)) {
    value = value.slice(name.length + 1).trim();
  }
  value = value.replace(/^['"]|['"]$/g, "").trim().replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null as unknown as URL;
  }
  if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
    throw new Error(
      `${name} tidak valid: "${raw}". Isi hanya nilainya saja, contoh: http://postgrest:3001`
    );
  }
  return value;
}

function baseUrl() {
  return envUrl("POSTGREST_URL");
}

function jwtSecret(): Uint8Array {
  const secret = process.env.POSTGREST_JWT_SECRET;
  if (!secret) throw new Error("POSTGREST_JWT_SECRET belum dikonfigurasi");
  return new TextEncoder().encode(secret);
}

// Cache admin token until 30s before expiry
let cachedAdminToken: string | null = null;
let cachedAdminTokenExpiry = 0;

/**
 * Generate or return cached admin JWT for PostgREST.
 * Uses POSTGREST_JWT_SECRET (NOT session secret).
 *
 * `db_role` is the Postgres role PostgREST switches to (see PGRST_JWT_ROLE_CLAIM_KEY),
 * `role` stays the application role that the RLS policies read.
 */
export async function adminToken(): Promise<string> {
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

  cachedAdminToken = await new SignJWT({
    role: "service_role",
    db_role: "service_role",
    user_id: "00000000-0000-0000-0000-000000000000",
    business_id: "00000000-0000-0000-0000-000000000000",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(jwtSecret());

  cachedAdminTokenExpiry = now + 5 * 60 * 1000;
  return cachedAdminToken;
}

/**
 * Mint a short-lived PostgREST token for a logged-in user.
 *
 * The session cookie is signed with SESSION_SECRET and carries role "OWNER"/"KASIR",
 * which PostgREST can neither verify (different secret) nor switch to (not a DB role).
 * So we re-sign the claims with POSTGREST_JWT_SECRET and run every user query as the
 * `authenticated` Postgres role, leaving RLS to filter on business_id + role.
 */
export async function userToken(session: {
  user_id: string;
  business_id: string;
  role: "OWNER" | "KASIR";
}): Promise<string> {
  return new SignJWT({
    role: session.role,
    db_role: "authenticated",
    user_id: session.user_id,
    business_id: session.business_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(jwtSecret());
}

export async function postgrest(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept-Profile", process.env.POSTGREST_SCHEMA || "public");
  headers.set("Content-Profile", process.env.POSTGREST_SCHEMA || "public");
  headers.set("Authorization", `Bearer ${token || (await adminToken())}`);
  const url = `${baseUrl()}${path}`;
  try {
    return await fetch(url, { ...init, headers, cache: "no-store" });
  } catch (error) {
    console.error(`[postgrest] Network error fetching ${url}:`, error);
    throw new Error(
      `Tidak bisa terhubung ke database service (${process.env.POSTGREST_URL || "POSTGREST_URL NOT SET"}). Pastikan PostgREST berjalan.`
    );
  }
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

/**
 * Count rows matching a filter without fetching them.
 *
 * `select=count` (used throughout this codebase historically) is NOT valid
 * PostgREST syntax — it is read as a column named "count", which fails with
 * `column "count" does not exist` unless db-aggregates-enabled is on (it
 * isn't, by default). The correct way to count is `Prefer: count=exact` plus
 * the `Content-Range` response header, which this wraps.
 *
 * `path` is the filter query WITHOUT a leading `select=` param, e.g.
 * `/items?business_id=eq.${id}&item_type=eq.PRODUCT`.
 */
export async function postgrestCount(path: string, token?: string): Promise<number> {
  const separator = path.includes("?") ? "&" : "?";
  const response = await postgrest(
    `${path}${separator}select=id&limit=1`,
    { headers: { Prefer: "count=exact" } },
    token
  );
  await response.text(); // drain body, we only need the header
  if (!response.ok) {
    throw Object.assign(new Error(`PostgREST count error ${response.status}`), { status: response.status });
  }
  const range = response.headers.get("content-range"); // "0-0/57" or "*/0"
  if (!range) return 0;
  const total = range.split("/")[1];
  return total === "*" || !total ? 0 : Number(total);
}
