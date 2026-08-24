import bcrypt from "bcryptjs";
import { apiData, apiError } from "@/lib/api-response";
import { setSession } from "@/lib/auth";
import { postgrestJson } from "@/lib/postgrest";

export async function POST(request: Request) {
  try {
    const { business_id, pin } = await request.json() as { business_id?: string; pin?: string };
    if (!business_id || !/^\d{6}$/.test(pin || "")) return apiError("Business ID dan PIN 6 digit wajib diisi.", 422, "VALIDATION_ERROR");
    const rows = await postgrestJson<Array<{ id: string; business_id: string; name: string; pin_hash: string; role: "KASIR"; is_active: boolean }>>(`/app_users?business_id=eq.${business_id}&role=eq.KASIR&is_active=eq.true&select=id,business_id,name,pin_hash,role,is_active`);
    const validPin = pin || "";
    const user = rows.find((candidate) => candidate.pin_hash && bcrypt.compareSync(validPin, candidate.pin_hash));
    if (!user) return apiError("PIN kasir tidak valid.", 401, "INVALID_PIN");
    await setSession({ user_id: user.id, business_id: user.business_id, role: "KASIR", name: user.name });
    return apiData({ user_id: user.id, business_id: user.business_id, name: user.name, role: user.role });
  } catch (error) { return apiError(error instanceof Error ? error.message : "Login kasir gagal.", 500, "CASHIER_LOGIN_FAILED"); }
}
