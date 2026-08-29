import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson, postgrestCount } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";
import { dayEndExclusive, dayStart } from "@/lib/query";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";
    const weekStartDate = new Date(`${today}T00:00:00Z`);
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - 6);
    const weekStart = weekStartDate.toISOString().slice(0, 10);

    const [
      todaySales,
      todayExpenses,
      criticalMaterials,
      dueReceivables,
      monthlySalesCount,
      recentSales,
      recentBatches,
      recentPurchases,
      allProducts,
      allMaterials,
      weekSales,
    ] = await Promise.all([
      // Today's sales total
      postgrestJson<Array<{ total: string }>>(
        `/transactions?select=total&transaction_type=eq.SALE&occurred_at=gte.${dayStart(today)}&occurred_at=lt.${dayEndExclusive(today)}`,
        {},
        auth.token
      ),
      // Today's expenses
      postgrestJson<Array<{ amount: string }>>(
        `/expenses?select=amount&expense_date=gte.${today}&expense_date=lte.${today}`,
        {},
        auth.token
      ),
      // Critical materials (stock <= 2)
      postgrestJson<Array<{ id: string; name: string; stock_qty: string; units: { code: string } }>>(
        `/items?select=id,name,stock_qty,units(code)&item_type=eq.RAW_MATERIAL&is_active=eq.true&stock_qty=lte.2&order=stock_qty&limit=5`,
        {},
        auth.token
      ),
      // Due receivables
      postgrestJson<Array<{ amount: string; paid_amount: string; due_date: string; parties: { name: string } }>>(
        `/receivables?select=amount,paid_amount,due_date,parties(name)&status=neq.LUNAS&order=due_date&limit=5`,
        {},
        auth.token
      ),
      // Monthly sales count (for plan limits)
      postgrestCount(`/transactions?transaction_type=eq.SALE&occurred_at=gte.${monthStart}`, auth.token),
      // Recent sales (last 5)
      postgrestJson<Array<{ id: string; total: string; occurred_at: string; payment_method: string }>>(
        `/transactions?select=id,total,occurred_at,payment_method&transaction_type=eq.SALE&order=occurred_at.desc&limit=5`,
        {},
        auth.token
      ),
      // Recent batches (last 3)
      postgrestJson<Array<{ id: string; batch_code: string; output_qty: string; cogs_per_unit: string; produced_at: string; items: { name: string } }>>(
        `/production_batches?select=id,batch_code,output_qty,cogs_per_unit,produced_at,items!output_item_id(name)&order=produced_at.desc&limit=3`,
        {},
        auth.token
      ),
      // Recent purchases (last 3)
      postgrestJson<Array<{ id: string; total: string; occurred_at: string; parties: { name: string } }>>(
        `/transactions?select=id,total,occurred_at,parties(name)&transaction_type=eq.PURCHASE&order=occurred_at.desc&limit=3`,
        {},
        auth.token
      ),
      // All active products count
      postgrestCount(`/items?item_type=eq.PRODUCT&is_active=eq.true`, auth.token),
      // All active materials count
      postgrestCount(`/items?item_type=eq.RAW_MATERIAL&is_active=eq.true`, auth.token),
      // Last 7 days of sales, for the dashboard trend chart
      postgrestJson<Array<{ total: string; occurred_at: string }>>(
        `/transactions?select=total,occurred_at&transaction_type=eq.SALE&occurred_at=gte.${dayStart(weekStart)}&occurred_at=lt.${dayEndExclusive(today)}&order=occurred_at&limit=2000`,
        {},
        auth.token
      ),
    ]);

    // One bucket per day so days with no sales still render as an empty column.
    const trendBuckets = new Map<string, number>();
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - offset);
      trendBuckets.set(date.toISOString().slice(0, 10), 0);
    }
    for (const sale of weekSales) {
      const day = String(sale.occurred_at || "").slice(0, 10);
      if (trendBuckets.has(day)) {
        trendBuckets.set(day, (trendBuckets.get(day) || 0) + Number(sale.total || 0));
      }
    }
    const salesTrend = [...trendBuckets].map(([date, total]) => ({ date, total }));

    // Calculate today's COGS from transaction items
    const todaySaleIds = recentSales
      .filter((s) => s.occurred_at?.startsWith(today))
      .map((s) => s.id);

    let todayCogs = 0;
    if (todaySaleIds.length > 0) {
      const cogsItems = await postgrestJson<Array<{ qty: string; cogs_at_sale: string }>>(
        `/transaction_items?select=qty,cogs_at_sale,transactions!inner(transaction_type,occurred_at)&transactions.transaction_type=eq.SALE&transactions.occurred_at=gte.${dayStart(today)}&transactions.occurred_at=lt.${dayEndExclusive(today)}`,
        {},
        auth.token
      );
      todayCogs = cogsItems.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.cogs_at_sale || 0), 0);
    }

    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
    const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return apiData({
      today: {
        revenue: todayRevenue,
        cogs: todayCogs,
        grossProfit: todayRevenue - todayCogs,
        expenses: todayExpenseTotal,
        netProfit: todayRevenue - todayCogs - todayExpenseTotal,
      },
      salesTrend,
      plan: {
        salesCount: monthlySalesCount,
        productCount: allProducts,
        materialCount: allMaterials,
      },
      criticalMaterials: criticalMaterials.map((m) => ({
        id: m.id,
        name: m.name,
        stock: Number(m.stock_qty),
        unit: m.units?.code || "pcs",
      })),
      dueReceivables: dueReceivables.map((r) => ({
        customer: r.parties?.name || "Pelanggan",
        remaining: Number(r.amount) - Number(r.paid_amount || 0),
        dueDate: r.due_date,
      })),
      recentActivity: {
        sales: recentSales.map((s) => ({
          id: s.id,
          total: Number(s.total),
          date: s.occurred_at,
          method: s.payment_method,
        })),
        batches: recentBatches.map((b) => ({
          id: b.id,
          code: b.batch_code,
          product: b.items?.name || "Produk",
          qty: Number(b.output_qty),
          cogs: Number(b.cogs_per_unit),
          date: b.produced_at,
        })),
        purchases: recentPurchases.map((p) => ({
          id: p.id,
          total: Number(p.total),
          supplier: p.parties?.name || "Supplier",
          date: p.occurred_at,
        })),
      },
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Dashboard gagal dimuat.", 502, "DASHBOARD_FAILED");
  }
}
