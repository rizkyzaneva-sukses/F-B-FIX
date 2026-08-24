import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { setSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string; business_name?: string; name?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";
    const businessName = body.business_name?.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return apiError("Format email tidak valid.", 422, "VALIDATION_ERROR");
    if (password.length < 8) return apiError("Password minimal 8 karakter.", 422, "VALIDATION_ERROR");
    if (!businessName) return apiError("Nama usaha wajib diisi.", 422, "VALIDATION_ERROR");
    const business = (await postgrestJson<Array<{ id: string; name: string }>>("/businesses", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: businessName }) }))[0];
    const user = (await postgrestJson<Array<{ id: string; business_id: string; name: string; role: "OWNER" }>>("/app_users", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ business_id: business.id, email, name: body.name?.trim() || email.split("@")[0], password_hash: await bcrypt.hash(password, 12), role: "OWNER" }) }))[0];
    await postgrestJson("/rpc/seed_default_units", { method: "POST", body: JSON.stringify({ p_business_id: business.id }) });
    await setSession({ user_id: user.id, business_id: user.business_id, role: "OWNER", name: user.name, email });
    return apiData({ user_id: user.id, business_id: business.id }, 201);
  } catch (error) { return apiError(error instanceof Error ? error.message : "Registrasi gagal.", 500, "REGISTER_FAILED"); }
}
