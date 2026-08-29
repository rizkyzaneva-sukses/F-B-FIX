import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";

export const dynamic = "force-dynamic";

const MAX_ROWS = 200;

async function optionalQuery<T>(label: string, query: Promise<T>, fallback: T): Promise<T> {
  try {
    return await query;
  } catch (error) {
    console.error(`[bootstrap] ${label} skipped:`, error);
    return fallback;
  }
}

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const [
      businesses,
      products,
      materials,
      customers,
      suppliers,
      receivables,
      expenses,
      purchases,
      batches,
      productionOutputs,
      payables,
      capitalEntries,
      sales,
      saleItems,
      supplierReturns,
      cashReconciliations,
    ] = await Promise.all([
      postgrestJson<Array<Record<string, unknown>>>(
        `/businesses?select=*&id=eq.${auth.session.business_id}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/items?select=*,units(code,label)&item_type=eq.PRODUCT&is_active=eq.true&order=name&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/items?select=*,units(code,label)&item_type=eq.RAW_MATERIAL&is_active=eq.true&order=name&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/parties?select=*&party_type=eq.CUSTOMER&is_active=eq.true&order=name&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/parties?select=*&party_type=eq.SUPPLIER&is_active=eq.true&order=name&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/receivables?select=*,parties(name)&order=due_date&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/expenses?select=*&order=expense_date.desc&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/transactions?select=*,parties(name)&transaction_type=eq.PURCHASE&order=occurred_at.desc&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      optionalQuery(
        "production_batches",
        postgrestJson(
          `/production_batches?select=*,items!output_item_id(name)&order=produced_at.desc&limit=${MAX_ROWS}`,
          {},
          auth.token
        ),
        []
      ),
      optionalQuery(
        "production_outputs",
        postgrestJson(`/production_outputs?select=*,items(name)&limit=${MAX_ROWS}`, {}, auth.token),
        []
      ),
      postgrestJson(
        `/payables?select=*,parties(name)&order=updated_at.desc&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/capital_entries?select=*&order=entry_date.desc&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/transactions?select=*&transaction_type=eq.SALE&order=occurred_at.desc&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      postgrestJson(
        `/transaction_items?select=*,transactions!inner(transaction_type,occurred_at)&transactions.transaction_type=eq.SALE&limit=${MAX_ROWS}`,
        {},
        auth.token
      ),
      optionalQuery(
        "supplier_returns",
        postgrestJson(
          `/supplier_returns?select=*,parties(name)&order=return_date.desc&limit=${MAX_ROWS}`,
          {},
          auth.token
        ),
        []
      ),
      optionalQuery(
        "cash_reconciliations",
        postgrestJson(
          `/cash_reconciliations?select=*&order=reconciliation_date.desc&limit=${MAX_ROWS}`,
          {},
          auth.token
        ),
        []
      ),
    ]);

    return apiData({
      business: businesses[0],
      products,
      materials,
      customers,
      suppliers,
      receivables,
      expenses,
      purchases,
      batches,
      batchOutputs: productionOutputs,
      payables,
      capitalEntries,
      sales,
      saleItems,
      supplierReturns,
      cashReconciliations,
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat data bisnis.",
      502,
      "BACKEND_UNAVAILABLE"
    );
  }
}
