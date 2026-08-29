import { apiData, apiError } from "@/lib/api-response";
import { readSession } from "@/lib/auth";
export async function GET() { const session = await readSession(); return session ? apiData(session) : apiError("Sesi tidak ditemukan.", 401, "UNAUTHENTICATED"); }
