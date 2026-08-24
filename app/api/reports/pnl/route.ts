import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("dateFrom") || new Date().toISOString().slice(0, 10);
    const to = url.searchParams.get("dateTo") || from;

    const [sales, lines, expenses, capital, payables, receivables, purchases, inventoryRows] =
      await Promise.all([
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
        postgrestJson<Array<{ amount: string; expense_type: string }>>(
          `/expenses?select=amount,expense_type&expense_date=gte.${from}&expense_date=lte.${to}`,
          {},
          auth.token
        ),
        postgrestJson<Array<{ entry_type: string; amount: string }>>(
          `/capital_entries?select=*&entry_date=gte.${from}&entry_date=lte.${to}`,
          {},
          auth.token
        ),
        postgrestJson<Array<{ amount: string; paid_amount: string }>>(
          "/payables?select=amount,paid_amount",
          {},
          auth.token
        ),
        postgrestJson<Array<{ amount: string; paid_amount: string }>>(
          "/receivables?select=amount,paid_amount",
          {},
          auth.token
        ),
        postgrestJson<Array<{ paid_amount: string }>>(
          `/transactions?select=paid_amount&transaction_type=eq.PURCHASE&occurred_at=gte.${from}T00:00:00&occurred_at=lte.${to}T23:59:59`,
          {},
          auth.token
        ),
        postgrestJson<Array<{ stock_qty: string; last_cogs: string; last_buy_price: string }>>(
          "/items?select=stock_qty,last_cogs,last_buy_price&is_active=eq.true",
          {},
          auth.token
        ),
      ]);

    const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
    // FIX: Use qty * cogs_at_sale (not subtotal * cogs_at_sale)
    const cogs = lines.reduce((s, x) => s + Number(x.qty || 0) * Number(x.cogs_at_sale || 0), 0);
    const expenseTotal = expenses
      .filter((x) => x.expense_type !== "OWNER_WITHDRAWAL")
      .reduce((s, x) => s + Number(x.amount), 0);
    const additions = capital
      .filter((x) => x.entry_type !== "WITHDRAWAL")
      .reduce((s, x) => s + Number(x.amount), 0);
    const withdrawals =
      capital
        .filter((x) => x.entry_type === "WITHDRAWAL")
        .reduce((s, x) => s + Number(x.amount), 0) +
      expenses
        .filter((x) => x.expense_type === "OWNER_WITHDRAWAL")
        .reduce((s, x) => s + Number(x.amount), 0);
    const purchaseCash = purchases.reduce((s, x) => s + Number(x.paid_amount || 0), 0);
    const receivableBalance = receivables.reduce(
      (s, x) => s + Number(x.amount) - Number(x.paid_amount || 0),
      0
    );
    const payableBalance = payables.reduce(
      (s, x) => s + Number(x.amount) - Number(x.paid_amount || 0),
      0
    );
    const inventory = inventoryRows.reduce(
      (s, x) => s + Number(x.stock_qty || 0) * Number(x.last_cogs || x.last_buy_price || 0),
      0
    );
    const net = revenue - cogs - expenseTotal;
    const cash = revenue - expenseTotal - purchaseCash + additions - withdrawals;

    return apiData({
      revenue,
      cogs,
      gross_profit: revenue - cogs,
      expenses: expenseTotal,
      net_profit: net,
      cash_flow: {
        opening: 0,
        operating: revenue - expenseTotal - purchaseCash,
        investing: 0,
        financing: additions - withdrawals,
        net: cash,
      },
      balance_sheet: {
        cash,
        inventory,
        receivables: receivableBalance,
        assets: cash + inventory + receivableBalance,
        payables: payableBalance,
        equity: additions + net - withdrawals,
      },
      dateFrom: from,
      dateTo: to,
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Laporan gagal dimuat.",
      502,
      "REPORT_FAILED"
    );
  }
}
