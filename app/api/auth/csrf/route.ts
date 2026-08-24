import { apiData, apiError } from "@/lib/api-response";
import { readSession } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/csrf";

export async function GET() {
  const session = await readSession();
  if (!session) return apiError("Sesi tidak ditemukan.", 401, "UNAUTHENTICATED");

  const token = generateCsrfToken(session.user_id);
  return apiData({ csrf_token: token });
}
