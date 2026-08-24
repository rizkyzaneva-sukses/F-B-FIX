import { apiData, apiError } from "@/lib/api-response";
import { postgrestJson } from "@/lib/postgrest";
import { requireSession } from "@/lib/route-auth";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const [businesses, products, materials, customers, suppliers, receivables, expenses, purchases, batches, payables, capitalEntries, sales, saleItems] = await Promise.all([
      postgrestJson<Array<Record<string, unknown>>>("/businesses?select=*&id=eq." + auth.session.business_id, {}, auth.token),
      postgrestJson("/items?select=*,units(code,label)&item_type=eq.PRODUCT&is_active=eq.true&order=name", {}, auth.token),
      postgrestJson("/items?select=*,units(code,label)&item_type=eq.RAW_MATERIAL&is_active=eq.true&order=name", {}, auth.token),
      postgrestJson("/parties?select=*&party_type=eq.CUSTOMER&is_active=eq.true&order=name", {}, auth.token),
      postgrestJson("/parties?select=*&party_type=eq.SUPPLIER&is_active=eq.true&order=name", {}, auth.token),
      postgrestJson("/receivables?select=*,parties(name)&order=due_date", {}, auth.token),
      postgrestJson("/expenses?select=*&order=expense_date.desc", {}, auth.token),
      postgrestJson("/transactions?select=*,parties(name)&transaction_type=eq.PURCHASE&order=occurred_at.desc", {}, auth.token),
      postgrestJson("/production_batches?select=*,items(name)&order=produced_at.desc", {}, auth.token),
      postgrestJson("/payables?select=*,parties(name)&order=updated_at.desc", {}, auth.token),
      postgrestJson("/capital_entries?select=*&order=entry_date.desc", {}, auth.token),
      postgrestJson("/transactions?select=*&transaction_type=eq.SALE&order=occurred_at.desc", {}, auth.token),
      postgrestJson("/transaction_items?select=*,transactions!inner(transaction_type,occurred_at)&transactions.transaction_type=eq.SALE", {}, auth.token),
    ]);
    return apiData({ business: businesses[0], products, materials, customers, suppliers, receivables, expenses, purchases, batches, payables, capitalEntries, sales, saleItems });
  } catch (error) { return apiError(error instanceof Error ? error.message : "Gagal memuat data bisnis.", 502, "BACKEND_UNAVAILABLE"); }
}
