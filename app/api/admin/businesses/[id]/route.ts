import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson, postgrestCount } from "@/lib/postgrest";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET: Get business details
 * PATCH: Update business (plan, status, limits)
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const [businesses, users, subscriptions, payments, usage] = await Promise.all([
      postgrestJson<Array<Record<string, unknown>>>(
        `/businesses?select=*&id=eq.${id}`,
        {},
        auth.token
      ),
      postgrestJson<Array<Record<string, unknown>>>(
        `/app_users?select=*&business_id=eq.${id}&order=created_at`,
        {},
        auth.token
      ),
      postgrestJson<Array<Record<string, unknown>>>(
        `/subscriptions?select=*&business_id=eq.${id}&order=created_at.desc&limit=10`,
        {},
        auth.token
      ),
      postgrestJson<Array<Record<string, unknown>>>(
        `/payments?select=*&business_id=eq.${id}&order=created_at.desc&limit=20`,
        {},
        auth.token
      ),
      getUsageStats(id),
    ]);

    const business = businesses[0];
    if (!business) return apiError("Bisnis tidak ditemukan.", 404, "NOT_FOUND");

    return apiData({
      business,
      users,
      subscriptions,
      payments,
      usage,
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat detail bisnis.",
      502,
      "ADMIN_BUSINESS_DETAIL_FAILED"
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    // Allow updating plan
    if (body.plan && ["FREE", "PRO"].includes(body.plan)) {
      updates.plan = body.plan;
    }

    // Allow updating limits
    if (typeof body.sales_transaction_limit === "number") {
      updates.sales_transaction_limit = body.sales_transaction_limit;
    }
    if (typeof body.product_limit === "number") {
      updates.product_limit = body.product_limit;
    }
    if (typeof body.raw_material_limit === "number") {
      updates.raw_material_limit = body.raw_material_limit;
    }

    if (Object.keys(updates).length === 0) {
      return apiError("Tidak ada perubahan yang valid.", 422, "VALIDATION_ERROR");
    }

    const result = await postgrestJson(
      `/businesses?id=eq.${id}&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(updates),
      },
      auth.token
    );

    return apiData(result);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memperbarui bisnis.",
      500,
      "ADMIN_BUSINESS_UPDATE_FAILED"
    );
  }
}

async function getUsageStats(businessId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [salesToday, salesThisMonth, productCount, materialCount, receivables, expenses] = await Promise.all([
    postgrestJson<Array<{ total: string }>>(
      `/transactions?select=total&business_id=eq.${businessId}&transaction_type=eq.SALE&occurred_at=gte.${today}T00:00:00`
    ),
    postgrestCount(`/transactions?business_id=eq.${businessId}&transaction_type=eq.SALE&occurred_at=gte.${monthStart}`),
    postgrestCount(`/items?business_id=eq.${businessId}&item_type=eq.PRODUCT&is_active=eq.true`),
    postgrestCount(`/items?business_id=eq.${businessId}&item_type=eq.RAW_MATERIAL&is_active=eq.true`),
    postgrestJson<Array<{ amount: string; paid_amount: string }>>(
      `/receivables?select=amount,paid_amount&business_id=eq.${businessId}&status=neq.LUNAS`
    ),
    postgrestJson<Array<{ amount: string }>>(
      `/expenses?select=amount&business_id=eq.${businessId}&expense_date=gte.${monthStart}`
    ),
  ]);

  return {
    salesToday: salesToday.reduce((sum, s) => sum + Number(s.total), 0),
    salesThisMonth,
    productCount,
    materialCount,
    outstandingReceivables: receivables.reduce(
      (sum, r) => sum + Number(r.amount) - Number(r.paid_amount || 0),
      0
    ),
    expensesThisMonth: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
  };
}
