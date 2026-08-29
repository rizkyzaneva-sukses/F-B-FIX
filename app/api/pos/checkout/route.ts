import { apiData, apiError, statusFromError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const payload = (await request.json()) as Record<string, unknown>;

    if (payload.payment_method === "HUTANG" && !payload.party_id) {
      const name = String(payload.customer_name || "").trim();
      if (!name) {
        return apiError("Nama pelanggan wajib diisi untuk penjualan hutang.", 422, "VALIDATION_ERROR");
      }

      const existing = await postgrestJson<Array<{ id: string }>>(
        `/parties?party_type=eq.CUSTOMER&name=eq.${encodeURIComponent(name)}&select=id&limit=1`,
        {},
        auth.token
      );

      // Register the customer on first credit sale, the way purchases already do for
      // suppliers. Without this a HUTANG sale to a new customer just failed.
      // Uses the service token because cashiers may sell on credit but RLS only lets
      // owners write to `parties` directly; business_id still comes from the session.
      payload.party_id =
        existing[0]?.id ||
        (
          await postgrestJson<Array<{ id: string }>>("/parties?select=id", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              business_id: auth.session.business_id,
              party_type: "CUSTOMER",
              customer_kind: "RETAIL",
              name,
              phone: "",
              address: "",
            }),
          })
        )[0]?.id;
    }

    const result = await postgrestJson(
      "/rpc/checkout_pos",
      { method: "POST", body: JSON.stringify({ p_payload: payload }) },
      auth.token
    );
    return apiData(result, 201);
  } catch (error) {
    const detail = statusFromError(error);
    return apiError(detail.message, detail.status === 500 ? 409 : detail.status, "CHECKOUT_FAILED");
  }
}
