import { apiData } from "@/lib/api-response";

export async function GET() {
  return apiData({ status: "ok" });
}
