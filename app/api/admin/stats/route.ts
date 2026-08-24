import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET: Admin dashboard statistics
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7) + "-01";

    const [
      totalBusinesses,
      proBusinesses,
      freeBusinesses,
      totalUsers,
      activeUsersToday,
      totalTransactionsMonth,
      totalTransactionsLastMonth,
      totalRevenueMonth,
      totalPaymentsMonth,
      pendingUpgrades,
      recentBusinesses,
    ] = await Promise.all([
      postgrestJson<Array<{ count: number }>>(
        `/businesses?select=count`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ count: number }>>(
        `/businesses?select=count&plan=eq.PRO`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ count: number }>>(
        `/businesses?select=count&plan=eq.FREE`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ count: number }>>(
        `/app_users?select=count`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ count: number }>>(
        `/app_users?select=count&is_active=eq.true`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ count: number }>>(
        `/transactions?select=count&transaction_type=eq.SALE&occurred_at=gte.${monthStart}`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ count: number }>>(
        `/transactions?select=count&transaction_type=eq.SALE&occurred_at=gte.${lastMonth}&occurred_at=lt.${monthStart}`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ total: string }>>(
        `/transactions?select=total&transaction_type=eq.SALE&occurred_at=gte.${monthStart}`
      ),
      postgrestJson<Array<{ amount: string }>>(
        `/payments?select=amount&status=eq.SUCCESS&paid_at=gte.${monthStart}`
      ),
      postgrestJson<Array<{ count: number }>>(
        `/upgrade_requests?select=count&status=eq.PENDING`,
        { headers: { Prefer: "count=exact" } }
      ),
      postgrestJson<Array<{ id: string; name: string; plan: string; created_at: string }>>(
        `/businesses?select=id,name,plan,created_at&order=created_at.desc&limit=5`
      ),
    ]);

    const revenueMonth = totalRevenueMonth.reduce((sum, t) => sum + Number(t.total), 0);
    const paymentsMonth = totalPaymentsMonth.reduce((sum, p) => sum + Number(p.amount), 0);
    const txThisMonth = Number(totalTransactionsMonth[0]?.count ?? 0);
    const txLastMonth = Number(totalTransactionsLastMonth[0]?.count ?? 0);
    const txGrowth = txLastMonth > 0 ? ((txThisMonth - txLastMonth) / txLastMonth) * 100 : 0;

    return apiData({
      overview: {
        totalBusinesses: Number(totalBusinesses[0]?.count ?? 0),
        proBusinesses: Number(proBusinesses[0]?.count ?? 0),
        freeBusinesses: Number(freeBusinesses[0]?.count ?? 0),
        totalUsers: Number(totalUsers[0]?.count ?? 0),
        activeUsers: Number(activeUsersToday[0]?.count ?? 0),
      },
      revenue: {
        thisMonth: revenueMonth,
        paymentsThisMonth: paymentsMonth,
        mrr: paymentsMonth, // Monthly Recurring Revenue
      },
      transactions: {
        thisMonth: txThisMonth,
        lastMonth: txLastMonth,
        growth: Math.round(txGrowth * 10) / 10,
      },
      pendingUpgrades: Number(pendingUpgrades[0]?.count ?? 0),
      recentBusinesses: recentBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        plan: b.plan,
        createdAt: b.created_at,
      })),
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat statistik admin.",
      502,
      "ADMIN_STATS_FAILED"
    );
  }
}
