import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export type Session = JWTPayload & { user_id: string; business_id: string; role: "OWNER" | "KASIR"; name: string; email?: string };
const COOKIE_NAME = "dk_session";

function secret() {
  const value = process.env.POSTGREST_JWT_SECRET;
  if (!value || value.length < 32) throw new Error("POSTGREST_JWT_SECRET harus berisi minimal 32 karakter");
  return new TextEncoder().encode(value);
}

export async function signSession(payload: Omit<Session, "iat" | "exp">) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as Session;
  } catch { return null; }
}

export async function sessionToken() { return (await cookies()).get(COOKIE_NAME)?.value || null; }

export async function setSession(payload: Omit<Session, "iat" | "exp">) {
  (await cookies()).set(COOKIE_NAME, await signSession(payload), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearSession() { (await cookies()).delete(COOKIE_NAME); }
