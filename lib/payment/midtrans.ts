/**
 * Midtrans Payment Gateway Integration
 * Docs: https://api-docs.midtrans.com/
 */

const MIDTRANS_BASE_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

const MIDTRANS_SNAP_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(serverKey() + ":").toString("base64")}`;
}

export interface MidtransTransactionParams {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    firstName: string;
    email: string;
    phone?: string;
  };
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  callbacks?: {
    finish?: string;
    unfinish?: string;
    error?: string;
  };
}

export interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransTransactionStatus {
  order_id: string;
  transaction_status: string;
  payment_type: string;
  transaction_id: string;
  gross_amount: string;
  transaction_time: string;
  settlement_time?: string;
  fraud_status?: string;
  status_code: string;
  status_message: string;
}

/**
 * Create Snap transaction token for checkout page.
 */
export async function createSnapTransaction(
  params: MidtransTransactionParams
): Promise<MidtransSnapResponse> {
  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    customer_details: params.customerDetails,
    item_details: params.itemDetails,
    callbacks: params.callbacks,
    credit_card: {
      secure: true,
    },
  };

  const response = await fetch(MIDTRANS_SNAP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Midtrans error: ${error}`);
  }

  return response.json();
}

/**
 * Check transaction status.
 */
export async function getTransactionStatus(
  orderId: string
): Promise<MidtransTransactionStatus> {
  const response = await fetch(
    `${MIDTRANS_BASE_URL}/v2/${orderId}/status`,
    {
      headers: {
        Authorization: authHeader(),
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Midtrans status error: ${error}`);
  }

  return response.json();
}

/**
 * Cancel transaction.
 */
export async function cancelTransaction(orderId: string): Promise<MidtransTransactionStatus> {
  const response = await fetch(
    `${MIDTRANS_BASE_URL}/v2/${orderId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Midtrans cancel error: ${error}`);
  }

  return response.json();
}

/**
 * Verify notification from Midtrans webhook.
 * Returns transaction status if signature is valid.
 */
export async function handleNotification(
  body: Record<string, unknown>
): Promise<MidtransTransactionStatus> {
  const orderId = body.order_id as string;
  const statusCode = body.status_code as string;
  const grossAmount = body.gross_amount as string;
  const signatureKey = body.signature_key as string;

  // Verify signature
  const crypto = await import("crypto");
  const expectedSignature = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey()}`)
    .digest("hex");

  if (signatureKey !== expectedSignature) {
    throw new Error("Invalid signature");
  }

  // Get full status
  return getTransactionStatus(orderId);
}

/**
 * Map Midtrans status to our payment status.
 */
export function mapPaymentStatus(
  transactionStatus: string,
  fraudStatus?: string
): "SUCCESS" | "PENDING" | "FAILED" | "EXPIRED" {
  if (transactionStatus === "capture") {
    if (fraudStatus === "challenge") return "PENDING";
    return "SUCCESS";
  }
  if (transactionStatus === "settlement") return "SUCCESS";
  if (transactionStatus === "pending") return "PENDING";
  if (transactionStatus === "deny") return "FAILED";
  if (transactionStatus === "cancel" || transactionStatus === "refund") return "FAILED";
  if (transactionStatus === "expire") return "EXPIRED";
  return "PENDING";
}
