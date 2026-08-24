import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
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

    let query = `/businesses?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (search) query += `&name=ilike.*${encodeURIComponent(search)}*`;
    if (planFilter) query += `&plan=eq.${planFilter}`;

    const [businesses, totalCount] = await Promise.all([
      postgrestJson<Array<Record<string, unknown>>>(query, {
        headers: { Prefer: "count=exact" },
      }),
      postgrestJson<Array<{ count: number }>>(
        `/businesses?select=count${search ? `&name=ilike.*${encodeURIComponent(search)}*` : ""}${planFilter ? `&plan=eq.${planFilter}` : ""}`,
        { headers: { Prefer: "count=exact" } }
      ),
    ]);

    // Get usage stats for each business
    const businessesWithStats = await Promise.all(
      businesses.map(async (biz) => {
        const [users, salesCount, productCount, materialCount, recentPayment] = await Promise.all([
          postgrestJson<Array<{ id: string; name: string; role: string; is_active: boolean; email: string }>>(
            `/app_users?select=id,name,role,is_active,email&business_id=eq.${biz.id}`,
            {}
          ),
          postgrestJson<Array<{ count: number }>>(
            `/transactions?select=count&business_id=eq.${biz.id}&transaction_type=eq.SALE&occurred_at=gte.${new Date().toISOString().slice(0, 7)}-01`,
            { headers: { Prefer: "count=exact" } }
          ),
          postgrestJson<Array<{ count: number }>>(
            `/items?select=count&business_id=eq.${biz.id}&item_type=eq.PRODUCT&is_active=eq.true`,
            { headers: { Prefer: "count=exact" } }
          ),
          postgrestJson<Array<{ count: number }>>(
            `/items?select=count&business_id=eq.${biz.id}&item_type=eq.RAW_MATERIAL&is_active=eq.true`,
            { headers: { Prefer: "count=exact" } }
          ),
          postgrestJson<Array<{ amount: string; status: string; paid_at: string }>>(
            `/payments?select=amount,status,paid_at&business_id=eq.${biz.id}&order=created_at.desc&limit=1`,
            {}
          ),
        ]);

        return {
          ...biz,
          stats: {
            userCount: users.length,
            users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, active: u.is_active, email: u.email })),
            salesThisMonth: Number(salesCount[0]?.count ?? 0),
            productCount: Number(productCount[0]?.count ?? 0),
            materialCount: Number(materialCount[0]?.count ?? 0),
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
        total: Number(totalCount[0]?.count ?? 0),
        totalPages: Math.ceil(Number(totalCount[0]?.count ?? 0) / limit),
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
