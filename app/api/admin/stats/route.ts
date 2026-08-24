import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson, postgrestCount } from "@/lib/postgrest";
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
      postgrestCount(`/businesses`),
      postgrestCount(`/businesses?plan=eq.PRO`),
      postgrestCount(`/businesses?plan=eq.FREE`),
      postgrestCount(`/app_users`),
      postgrestCount(`/app_users?is_active=eq.true`),
      postgrestCount(`/transactions?transaction_type=eq.SALE&occurred_at=gte.${monthStart}`),
      postgrestCount(`/transactions?transaction_type=eq.SALE&occurred_at=gte.${lastMonth}&occurred_at=lt.${monthStart}`),
      postgrestJson<Array<{ total: string }>>(
        `/transactions?select=total&transaction_type=eq.SALE&occurred_at=gte.${monthStart}`
      ),
      postgrestJson<Array<{ amount: string }>>(
        `/payments?select=amount&status=eq.SUCCESS&paid_at=gte.${monthStart}`
      ),
      postgrestCount(`/upgrade_requests?status=eq.PENDING`),
      postgrestJson<Array<{ id: string; name: string; plan: string; created_at: string }>>(
        `/businesses?select=id,name,plan,created_at&order=created_at.desc&limit=5`
      ),
    ]);

    const revenueMonth = totalRevenueMonth.reduce((sum, t) => sum + Number(t.total), 0);
    const paymentsMonth = totalPaymentsMonth.reduce((sum, p) => sum + Number(p.amount), 0);
    const txThisMonth = totalTransactionsMonth;
    const txLastMonth = totalTransactionsLastMonth;
    const txGrowth = txLastMonth > 0 ? ((txThisMonth - txLastMonth) / txLastMonth) * 100 : 0;

    return apiData({
      overview: {
        totalBusinesses,
        proBusinesses,
        freeBusinesses,
        totalUsers,
        activeUsers: activeUsersToday,
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
      pendingUpgrades,
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
