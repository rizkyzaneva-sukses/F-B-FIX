import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";
import { pickEnum } from "@/lib/query";

const PARTY_TYPES = ["SUPPLIER", "CUSTOMER"] as const;
const CUSTOMER_KINDS = ["RETAIL", "MITRA"] as const;

export async function GET(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const type = pickEnum(url.searchParams.get("type"), PARTY_TYPES);
    const filters = ["select=*", "is_active=eq.true", "order=name", "limit=200"];
    if (type) filters.push(`party_type=eq.${type}`);
    return apiData(await postgrestJson(`/parties?${filters.join("&")}`, {}, auth.token));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Data pihak gagal dimuat.", 502, "PARTIES_FAILED");
  }
}

export async function POST(request: Request) {
  // Cashiers can create a customer/supplier inline from POS or purchases.
  // RLS still scopes the record to the authenticated business.
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    const partyType = pickEnum(String(body.party_type || ""), PARTY_TYPES);
    const creditLimit = Number(body.credit_limit || 0);
    const customerKind =
      partyType === "CUSTOMER"
        ? pickEnum(String(body.customer_kind || "RETAIL"), CUSTOMER_KINDS) || "RETAIL"
        : null;

    if (!name || !partyType || creditLimit < 0) {
      return apiError("Tipe pihak, nama, dan limit piutang wajib valid.", 422, "VALIDATION_ERROR");
    }

    const result = await postgrestJson(
      "/parties?select=*",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          business_id: auth.session.business_id,
          party_type: partyType,
          customer_kind: customerKind,
          name,
          phone: String(body.phone || ""),
          address: String(body.address || ""),
          credit_limit: creditLimit,
        }),
      },
      auth.token
    );
    return apiData(result, 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Pihak gagal disimpan.", 422, "PARTY_CREATE_FAILED");
  }
}
