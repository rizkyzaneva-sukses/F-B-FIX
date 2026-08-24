import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";
import { createSnapTransaction } from "@/lib/payment/midtrans";
import crypto from "crypto";

const PRO_PRICE = 99000; // Rp 99.000/bulan
const PRO_DURATION_MONTHS = 1;

/**
 * GET: Get current subscription status
 * POST: Create upgrade payment
 */
export async function GET() {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const [business, subscription, recentPayments] = await Promise.all([
      postgrestJson<Array<{ plan: string; sales_transaction_limit: number; product_limit: number; raw_material_limit: number }>>(
        `/businesses?select=plan,sales_transaction_limit,product_limit,raw_material_limit&id=eq.${auth.session.business_id}`,
        {},
        auth.token
      ),
      postgrestJson<Array<{
        id: string; plan: string; status: string;
        started_at: string; expires_at: string | null;
      }>>(
        `/subscriptions?select=id,plan,status,started_at,expires_at&business_id=eq.${auth.session.business_id}&order=created_at.desc&limit=1`,
        {},
        auth.token
      ),
      postgrestJson<Array<{
        id: string; amount: string; status: string;
        payment_method: string; paid_at: string; created_at: string;
      }>>(
        `/payments?select=id,amount,status,payment_method,paid_at,created_at&business_id=eq.${auth.session.business_id}&order=created_at.desc&limit=5`,
        {},
        auth.token
      ),
    ]);

    const biz = business[0];
    const sub = subscription[0];

    return apiData({
      currentPlan: biz?.plan || "FREE",
      limits: {
        salesLimit: biz?.sales_transaction_limit || 50,
        productLimit: biz?.product_limit || 30,
        materialLimit: biz?.raw_material_limit || 10,
      },
      subscription: sub
        ? {
            id: sub.id,
            plan: sub.plan,
            status: sub.status,
            startedAt: sub.started_at,
            expiresAt: sub.expires_at,
          }
        : null,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        method: p.payment_method,
        paidAt: p.paid_at,
        createdAt: p.created_at,
      })),
      proPrice: PRO_PRICE,
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat langganan.",
      502,
      "SUBSCRIPTION_FAILED"
    );
  }
}

export async function POST() {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    // Check if already PRO
    const business = await postgrestJson<Array<{ plan: string }>>(
      `/businesses?select=plan&id=eq.${auth.session.business_id}`,
      {},
      auth.token
    );

    if (business[0]?.plan === "PRO") {
      return apiError("Bisnis sudah dalam paket PRO.", 409, "ALREADY_PRO");
    }

    // Create subscription record. Deliberately uses the admin/service token, not
    // auth.token — RLS on `subscriptions` only allows service_role to write (migration
    // 008), so an owner can never self-grant PRO by inserting rows directly; only the
    // server can, after real payment confirmation via the Midtrans webhook.
    const subscription = (
      await postgrestJson<Array<{ id: string }>>(
        "/subscriptions?select=id",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            business_id: auth.session.business_id,
            plan: "PRO",
            status: "TRIAL",
            payment_gateway: "midtrans",
          }),
        }
      )
    )[0];

    // Create payment record (service token — same reasoning as above; `payments` RLS
    // also restricts writes to service_role).
    const orderId = `DK-${auth.session.business_id.slice(0, 8)}-${Date.now()}`;
    const payment = (
      await postgrestJson<Array<{ id: string }>>(
        "/payments?select=id",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            business_id: auth.session.business_id,
            subscription_id: subscription.id,
            amount: PRO_PRICE,
            currency: "IDR",
            status: "PENDING",
            gateway: "midtrans",
            gateway_order_id: orderId,
          }),
        }
      )
    )[0];

    // Create Midtrans Snap transaction
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const snap = await createSnapTransaction({
      orderId,
      grossAmount: PRO_PRICE,
      customerDetails: {
        firstName: auth.session.name,
        email: auth.session.email || "owner@dapurkasir.com",
      },
      itemDetails: [
        {
          id: "pro-monthly",
          price: PRO_PRICE,
          quantity: 1,
          name: "DapurKasir PRO - 1 Bulan",
        },
      ],
      callbacks: {
        finish: `${appUrl}/?payment=success`,
        unfinish: `${appUrl}/?payment=pending`,
        error: `${appUrl}/?payment=failed`,
      },
    });

    // Update payment with snap token (service token, same as the insert above)
    await postgrestJson(`/payments?id=eq.${payment.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        gateway_response: { snap_token: snap.token, redirect_url: snap.redirect_url },
      }),
    });

    return apiData({
      paymentId: payment.id,
      orderId,
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
      amount: PRO_PRICE,
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal membuat pembayaran.",
      500,
      "PAYMENT_FAILED"
    );
  }
}
