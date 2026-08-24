import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";

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
    ] = await Promise.all([
      // Today's sales total
      postgrestJson<Array<{ total: string }>>(
        `/transactions?select=total&transaction_type=eq.SALE&occurred_at=gte.${today}T00:00:00&occurred_at=lte.${today}T23:59:59`,
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
      postgrestJson<Array<{ count: number }>>(
        `/transactions?select=count&transaction_type=eq.SALE&occurred_at=gte.${monthStart}`,
        { headers: { Prefer: "count=exact" } },
        auth.token
      ),
      // Recent sales (last 5)
      postgrestJson<Array<{ id: string; total: string; occurred_at: string; payment_method: string }>>(
        `/transactions?select=id,total,occurred_at,payment_method&transaction_type=eq.SALE&order=occurred_at.desc&limit=5`,
        {},
        auth.token
      ),
      // Recent batches (last 3)
      postgrestJson<Array<{ id: string; batch_code: string; output_qty: string; cogs_per_unit: string; produced_at: string; items: { name: string } }>>(
        `/production_batches?select=id,batch_code,output_qty,cogs_per_unit,produced_at,items(name)&order=produced_at.desc&limit=3`,
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
      postgrestJson<Array<{ count: number }>>(
        `/items?select=count&item_type=eq.PRODUCT&is_active=eq.true`,
        { headers: { Prefer: "count=exact" } },
        auth.token
      ),
      // All active materials count
      postgrestJson<Array<{ count: number }>>(
        `/items?select=count&item_type=eq.RAW_MATERIAL&is_active=eq.true`,
        { headers: { Prefer: "count=exact" } },
        auth.token
      ),
    ]);

    // Calculate today's COGS from transaction items
    const todaySaleIds = recentSales
      .filter((s) => s.occurred_at?.startsWith(today))
      .map((s) => s.id);

    let todayCogs = 0;
    if (todaySaleIds.length > 0) {
      const cogsItems = await postgrestJson<Array<{ qty: string; cogs_at_sale: string }>>(
        `/transaction_items?select=qty,cogs_at_sale,transactions!inner(transaction_type,occurred_at)&transactions.transaction_type=eq.SALE&transactions.occurred_at=gte.${today}T00:00:00&transactions.occurred_at=lte.${today}T23:59:59`,
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
      plan: {
        salesCount: Number(monthlySalesCount[0]?.count ?? 0),
        productCount: Number(allProducts[0]?.count ?? 0),
        materialCount: Number(allMaterials[0]?.count ?? 0),
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
