import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { handleNotification, mapPaymentStatus } from "@/lib/payment/midtrans";

/**
 * POST: Handle Midtrans webhook notification
 * This endpoint is called by Midtrans when payment status changes.
 * No authentication required (verified by signature).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify and get transaction status from Midtrans
    const transactionStatus = await handleNotification(body);
    const paymentStatus = mapPaymentStatus(
      transactionStatus.transaction_status,
      transactionStatus.fraud_status
    );

    const orderId = transactionStatus.order_id;

    // Find payment record
    const payments = await postgrestJson<
      Array<{
        id: string;
        business_id: string;
        subscription_id: string;
        status: string;
      }>
    >(
      `/payments?gateway_order_id=eq.${orderId}&select=id,business_id,subscription_id,status`
    );

    const payment = payments[0];
    if (!payment) {
      console.error(`[Midtrans Webhook] Payment not found for order: ${orderId}`);
      return apiData({ status: "ignored" });
    }

    // Skip if already processed
    if (payment.status === "SUCCESS") {
      return apiData({ status: "already_processed" });
    }

    // Update payment status
    await postgrestJson(`/payments?id=eq.${payment.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: paymentStatus,
        payment_method: transactionStatus.payment_type,
        gateway_transaction_id: transactionStatus.transaction_id,
        gateway_response: transactionStatus,
        paid_at: paymentStatus === "SUCCESS" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }),
    });

    // If payment successful, activate PRO plan
    if (paymentStatus === "SUCCESS" && payment.subscription_id) {
      await postgrestJson("/rpc/activate_pro_plan", {
        method: "POST",
        body: JSON.stringify({
          p_business_id: payment.business_id,
          p_subscription_id: payment.subscription_id,
          p_duration_months: PRO_DURATION_MONTHS,
        }),
      });

      console.log(`[Midtrans Webhook] PRO activated for business: ${payment.business_id}`);
    }

    return apiData({ status: "processed", paymentStatus });
  } catch (error) {
    console.error("[Midtrans Webhook] Error:", error);
    return apiError(
      error instanceof Error ? error.message : "Webhook processing failed.",
      500,
      "WEBHOOK_FAILED"
    );
  }
}

const PRO_DURATION_MONTHS = 1;
