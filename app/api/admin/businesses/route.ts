import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson, postgrestCount } from "@/lib/postgrest";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET: List all businesses with usage stats
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const search = url.searchParams.get("search") || "";
    const planFilter = url.searchParams.get("plan") || "";
    const offset = (page - 1) * limit;

    const filterParts = [
      search ? `name=ilike.*${encodeURIComponent(search)}*` : null,
      planFilter ? `plan=eq.${encodeURIComponent(planFilter)}` : null,
    ].filter(Boolean);
    const filters = filterParts.length ? `&${filterParts.join("&")}` : "";
    const query = `/businesses?select=*&order=created_at.desc&limit=${limit}&offset=${offset}${filters}`;

    const [businesses, total] = await Promise.all([
      postgrestJson<Array<Record<string, unknown>>>(query),
      postgrestCount(filterParts.length ? `/businesses?${filterParts.join("&")}` : "/businesses"),
    ]);

    // Get usage stats for each business
    const businessesWithStats = await Promise.all(
      businesses.map(async (biz) => {
        const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
        const [users, salesThisMonth, productCount, materialCount, recentPayment] = await Promise.all([
          postgrestJson<Array<{ id: string; name: string; role: string; is_active: boolean; email: string }>>(
            `/app_users?select=id,name,role,is_active,email&business_id=eq.${biz.id}`
          ),
          postgrestCount(`/transactions?business_id=eq.${biz.id}&transaction_type=eq.SALE&occurred_at=gte.${monthStart}`),
          postgrestCount(`/items?business_id=eq.${biz.id}&item_type=eq.PRODUCT&is_active=eq.true`),
          postgrestCount(`/items?business_id=eq.${biz.id}&item_type=eq.RAW_MATERIAL&is_active=eq.true`),
          postgrestJson<Array<{ amount: string; status: string; paid_at: string }>>(
            `/payments?select=amount,status,paid_at&business_id=eq.${biz.id}&order=created_at.desc&limit=1`
          ),
        ]);

        return {
          ...biz,
          stats: {
            userCount: users.length,
            users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, active: u.is_active, email: u.email })),
            salesThisMonth,
            productCount,
            materialCount,
          },
          lastPayment: recentPayment[0]
            ? {
                amount: Number(recentPayment[0].amount),
                status: recentPayment[0].status,
                paidAt: recentPayment[0].paid_at,
              }
            : null,
        };
      })
    );

    return apiData({
      businesses: businessesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat bisnis.",
      502,
      "ADMIN_BUSINESSES_FAILED"
    );
  }
}
