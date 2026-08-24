import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function POST(request: Request) {
  const auth = await requireOwner(); if ("error" in auth) return auth.error;
  try { const body = await request.json() as { name?: string; pin?: string }; if (!body.name?.trim() || !/^\d{6}$/.test(body.pin || "")) return apiError("Nama dan PIN numerik 6 digit wajib diisi.", 422, "VALIDATION_ERROR"); const result = await postgrestJson("/app_users?select=id,name,role,is_active", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ business_id: auth.session.business_id, name: body.name.trim(), pin_hash: await bcrypt.hash(body.pin!, 12), role: "KASIR", is_active: true }) }, auth.token); return apiData(result, 201); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Kasir gagal dibuat.", 422, "CASHIER_CREATE_FAILED"); }
}
