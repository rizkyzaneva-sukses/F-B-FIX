import { apiError } from "@/lib/api-response";
import { requireOwner } from "@/lib/route-auth";
import { postgrestJson } from "@/lib/postgrest";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("dateFrom") || new Date().toISOString().slice(0, 10);
    const to = url.searchParams.get("dateTo") || from;

    const [sales, lines, expenses] = await Promise.all([
      postgrestJson<Array<{ total: string }>>(
        `/transactions?select=total&transaction_type=eq.SALE&occurred_at=gte.${from}T00:00:00&occurred_at=lte.${to}T23:59:59`,
        {},
        auth.token
      ),
      postgrestJson<Array<{ qty: string; cogs_at_sale: string }>>(
        `/transaction_items?select=qty,cogs_at_sale,transactions!inner(transaction_type,occurred_at)&transactions.transaction_type=eq.SALE&transactions.occurred_at=gte.${from}T00:00:00&transactions.occurred_at=lte.${to}T23:59:59`,
        {},
        auth.token
      ),
      postgrestJson<Array<{ amount: string }>>(
        `/expenses?select=amount&expense_date=gte.${from}&expense_date=lte.${to}`,
        {},
        auth.token
      ),
    ]);

    const revenue = sales.reduce((sum, item) => sum + Number(item.total), 0);
    // FIX: Use qty * cogs_at_sale (not subtotal * cogs_at_sale)
    const cogs = lines.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.cogs_at_sale || 0), 0);
    const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenseTotal;

    const csv = [
      "Tanggal,Omzet,COGS,Laba Kotor,Pengeluaran,Net Profit",
      `${from} s/d ${to},${revenue},${cogs},${grossProfit},${expenseTotal},${netProfit}`,
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=laporan-dapurkasir-${from}-${to}.csv`,
      },
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Export laporan gagal.", 502, "EXPORT_FAILED");
  }
}
