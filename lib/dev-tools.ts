import { postgrestJson } from "@/lib/postgrest";

/**
 * Trial-only helpers: wipe a business back to an empty state, or refill it with
 * demo data. Both run with the service token but are always scoped to a single
 * business_id taken from the caller session.
 *
 * Set TRIAL_TOOLS_ENABLED=false (and NEXT_PUBLIC_TRIAL_TOOLS=false) to turn the
 * feature off once the app is handed to a real client.
 */
export function trialToolsEnabled() {
  return process.env.TRIAL_TOOLS_ENABLED !== "false";
}

/** Child tables first so foreign keys never block a delete. */
const RESET_ORDER = [
  "transaction_items",
  "receivable_payments",
  "payable_payments",
  "receivables",
  "payables",
  "production_materials",
  "production_batches",
  "expenses",
  "capital_entries",
  "transactions",
  "items",
  "parties",
  "audit_logs",
] as const;

export async function resetBusinessData(businessId: string) {
  const deleted: Record<string, number> = {};
  for (const table of RESET_ORDER) {
    const rows = await postgrestJson<Array<{ id: unknown }> | null>(
      `/${table}?business_id=eq.${businessId}&select=id`,
      { method: "DELETE", headers: { Prefer: "return=representation" } }
    );
    deleted[table] = rows?.length ?? 0;
  }
  return deleted;
}

type ItemSeed = { name: string; unit: string; category: string; stock: number; price: number; buy: number; cogs: number };

const PRODUCTS: ItemSeed[] = [
  { name: "Sambal Bawang 150g", unit: "jar", category: "Sambal", stock: 42, price: 28000, buy: 0, cogs: 13200 },
  { name: "Chili Oil Original", unit: "botol", category: "Minyak", stock: 18, price: 35000, buy: 0, cogs: 16800 },
  { name: "Sambal Matah", unit: "jar", category: "Sambal", stock: 31, price: 30000, buy: 0, cogs: 14100 },
  { name: "Cireng Isi Ayam", unit: "pcs", category: "Frozen", stock: 9, price: 12000, buy: 0, cogs: 5400 },
  { name: "Cireng Isi Keju", unit: "pcs", category: "Frozen", stock: 24, price: 13000, buy: 0, cogs: 6100 },
  { name: "Sambal Ijo", unit: "jar", category: "Sambal", stock: 5, price: 29000, buy: 0, cogs: 13900 },
  { name: "Minyak Bawang", unit: "botol", category: "Minyak", stock: 12, price: 24000, buy: 0, cogs: 10800 },
  { name: "Paket Cicip", unit: "pcs", category: "Paket", stock: 7, price: 45000, buy: 0, cogs: 21700 },
];

const MATERIALS: ItemSeed[] = [
  { name: "Cabai rawit merah", unit: "kg", category: "Bahan Utama", stock: 2.4, price: 0, buy: 68000, cogs: 68000 },
  { name: "Minyak goreng premium", unit: "liter", category: "Bahan Utama", stock: 9, price: 0, buy: 18500, cogs: 18500 },
  { name: "Bawang putih", unit: "kg", category: "Bumbu", stock: 1.2, price: 0, buy: 42000, cogs: 42000 },
  { name: "Gula pasir", unit: "kg", category: "Bumbu", stock: 4.5, price: 0, buy: 17500, cogs: 17500 },
  { name: "Garam halus", unit: "kg", category: "Bumbu", stock: 8, price: 0, buy: 9500, cogs: 9500 },
  { name: "Botol kaca 150ml", unit: "pcs", category: "Kemasan", stock: 58, price: 0, buy: 2800, cogs: 2800 },
  { name: "Label DapurKasir", unit: "pcs", category: "Kemasan", stock: 170, price: 0, buy: 450, cogs: 450 },
];

const SUPPLIERS = ["Pasar Segar Bu Ani", "CV Sumber Pangan", "Kemasan Kita"];
const CUSTOMERS = ["Warung Bu Tini", "Reseller Kak Nia", "Kedai Pojok", "Katering Ibu Sri"];

type SalePlan = {
  daysAgo: number;
  method: "TUNAI" | "QRIS" | "TRANSFER" | "HUTANG";
  customer?: number;
  dueDays?: number;
  lines: Array<{ p: number; q: number }>;
};

const SALES: SalePlan[] = [
  { daysAgo: 0, method: "TUNAI", lines: [{ p: 0, q: 3 }, { p: 3, q: 2 }] },
  { daysAgo: 0, method: "QRIS", lines: [{ p: 1, q: 2 }] },
  { daysAgo: 1, method: "TUNAI", lines: [{ p: 2, q: 4 }, { p: 6, q: 1 }] },
  { daysAgo: 2, method: "TRANSFER", lines: [{ p: 7, q: 2 }] },
  { daysAgo: 3, method: "HUTANG", customer: 0, dueDays: 10, lines: [{ p: 0, q: 10 }, { p: 2, q: 5 }] },
  { daysAgo: 4, method: "TUNAI", lines: [{ p: 4, q: 6 }] },
  { daysAgo: 5, method: "QRIS", lines: [{ p: 1, q: 1 }, { p: 5, q: 2 }] },
  { daysAgo: 6, method: "TUNAI", lines: [{ p: 3, q: 5 }] },
  { daysAgo: 8, method: "HUTANG", customer: 1, dueDays: 14, lines: [{ p: 1, q: 6 }, { p: 6, q: 3 }] },
  { daysAgo: 9, method: "TUNAI", lines: [{ p: 0, q: 2 }, { p: 4, q: 2 }] },
  { daysAgo: 11, method: "QRIS", lines: [{ p: 7, q: 1 }] },
  { daysAgo: 13, method: "TUNAI", lines: [{ p: 2, q: 3 }] },
];

const PURCHASES = [
  { supplier: 0, material: 0, qty: 6, price: 68000, paidRatio: 1, daysAgo: 1 },
  { supplier: 2, material: 5, qty: 200, price: 2800, paidRatio: 0.35, daysAgo: 3 },
  { supplier: 1, material: 1, qty: 20, price: 18500, paidRatio: 0, daysAgo: 6 },
];

const BATCHES = [
  { product: 0, qty: 50, otherCost: 45000, daysAgo: 0, materials: [{ m: 0, q: 3 }, { m: 2, q: 0.8 }, { m: 1, q: 2 }, { m: 5, q: 50 }, { m: 6, q: 50 }] },
  { product: 1, qty: 30, otherCost: 35000, daysAgo: 1, materials: [{ m: 0, q: 2 }, { m: 1, q: 4 }, { m: 2, q: 0.5 }, { m: 5, q: 30 }, { m: 6, q: 30 }] },
  { product: 2, qty: 40, otherCost: 30000, daysAgo: 3, materials: [{ m: 0, q: 2.5 }, { m: 2, q: 0.6 }, { m: 4, q: 0.4 }, { m: 5, q: 40 }, { m: 6, q: 40 }] },
];

const EXPENSES: Array<{ category: string; amount: number; daysAgo: number; note: string; type: "OPERATING" | "OWNER_WITHDRAWAL" }> = [
  { category: "Kemasan", amount: 185000, daysAgo: 0, note: "Restock botol kaca dan label", type: "OPERATING" },
  { category: "Transport", amount: 75000, daysAgo: 1, note: "Ongkos kirim bahan", type: "OPERATING" },
  { category: "Gas", amount: 230000, daysAgo: 2, note: "Isi ulang tabung produksi", type: "OPERATING" },
  { category: "Gaji", amount: 1200000, daysAgo: 7, note: "Gaji mingguan tim produksi", type: "OPERATING" },
  { category: "Prive", amount: 500000, daysAgo: 10, note: "Pengambilan pribadi owner", type: "OWNER_WITHDRAWAL" },
];

const CAPITAL: Array<{ type: "INITIAL" | "ADDITION"; amount: number; daysAgo: number; notes: string }> = [
  { type: "INITIAL", amount: 15000000, daysAgo: 60, notes: "Modal awal usaha" },
  { type: "ADDITION", amount: 3000000, daysAgo: 20, notes: "Tambahan modal untuk stok lebaran" },
];

const dayMs = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number, hour = 10) => {
  const date = new Date(Date.now() - daysAgo * dayMs);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const isoDate = (daysAgo: number) => new Date(Date.now() - daysAgo * dayMs).toISOString().slice(0, 10);
const round2 = (value: number) => Math.round(value * 100) / 100;

type Row = { id: string };

async function insert<T extends Row = Row>(table: string, payload: unknown, select = "id") {
  return postgrestJson<T[]>(`/${table}?select=${select}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
}

export async function seedBusinessData(businessId: string, userId: string) {
  // Start from a clean slate so the button stays idempotent.
  await resetBusinessData(businessId);

  // Units are created at registration, but re-seed defensively.
  await postgrestJson("/rpc/seed_default_units", {
    method: "POST",
    body: JSON.stringify({ p_business_id: businessId }),
  }).catch(() => undefined);

  const units = await postgrestJson<Array<{ id: string; code: string }>>(
    `/units?business_id=eq.${businessId}&select=id,code`
  );
  if (!units.length) throw new Error("Satuan default belum tersedia untuk bisnis ini.");
  const unitId = (code: string) => units.find((unit) => unit.code === code)?.id || units[0].id;

  const parties = await insert<Row & { name: string }>("parties", [
    ...SUPPLIERS.map((name) => ({ business_id: businessId, party_type: "SUPPLIER", name, phone: "0812 0000 0000", address: "Bandung" })),
    ...CUSTOMERS.map((name, index) => ({
      business_id: businessId,
      party_type: "CUSTOMER",
      customer_kind: index % 2 === 1 ? "MITRA" : "RETAIL",
      name,
      phone: "0813 0000 0000",
      address: "Bandung",
      credit_limit: 1000000,
    })),
  ], "id,name");
  const partyId = (name: string) => parties.find((row) => row.name === name)!.id;
  const supplierIds = SUPPLIERS.map(partyId);
  const customerIds = CUSTOMERS.map(partyId);

  const items = await insert<Row & { name: string }>("items", [
    ...PRODUCTS.map((item) => ({
      business_id: businessId, unit_id: unitId(item.unit), item_type: "PRODUCT", name: item.name, category: item.category,
      sale_price: item.price, stock_qty: item.stock, last_buy_price: 0, last_cogs: item.cogs, track_stock: true, is_active: true,
    })),
    ...MATERIALS.map((item) => ({
      business_id: businessId, unit_id: unitId(item.unit), item_type: "RAW_MATERIAL", name: item.name, category: item.category,
      sale_price: 0, stock_qty: item.stock, last_buy_price: item.buy, last_cogs: item.buy, track_stock: true, is_active: true,
    })),
  ], "id,name");
  const itemId = (name: string) => items.find((row) => row.name === name)!.id;
  const productIds = PRODUCTS.map((item) => itemId(item.name));
  const materialIds = MATERIALS.map((item) => itemId(item.name));

  // --- Produksi batch ---
  const batchRows = BATCHES.map((batch, index) => {
    const materialCost = batch.materials.reduce((sum, line) => sum + line.q * MATERIALS[line.m].buy, 0);
    const cogsPerUnit = round2((materialCost + batch.otherCost) / batch.qty);
    return {
      batch,
      cogsPerUnit,
      payload: {
        business_id: businessId,
        output_item_id: productIds[batch.product],
        batch_code: `BATCH-${isoDate(batch.daysAgo).replaceAll("-", "").slice(2)}-${String(index + 1).padStart(3, "0")}`,
        output_qty: batch.qty,
        material_cost: round2(materialCost),
        other_cost: batch.otherCost,
        cogs_per_unit: cogsPerUnit,
        status: "COMPLETED",
        produced_at: iso(batch.daysAgo, 8),
        created_by: userId,
      },
    };
  });
  const batches = await insert("production_batches", batchRows.map((row) => row.payload));
  await insert("production_materials", batchRows.flatMap((row, index) =>
    row.batch.materials.map((line) => ({
      business_id: businessId, batch_id: batches[index].id, item_id: materialIds[line.m],
      qty_used: line.q, unit_cost: MATERIALS[line.m].buy, total_cost: round2(line.q * MATERIALS[line.m].buy),
    }))
  ));
  // Keep HPP produk sejalan dengan batch terakhirnya.
  await Promise.all(batchRows.map((row) =>
    postgrestJson(`/items?id=eq.${productIds[row.batch.product]}`, {
      method: "PATCH",
      body: JSON.stringify({ last_cogs: row.cogsPerUnit }),
    })
  ));

  // --- Penjualan ---
  const saleRows = SALES.map((sale) => {
    const total = sale.lines.reduce((sum, line) => sum + line.q * PRODUCTS[line.p].price, 0);
    return { sale, total, paid: sale.method === "HUTANG" ? 0 : total };
  });
  const sales = await insert("transactions", saleRows.map(({ sale, total, paid }) => ({
    business_id: businessId,
    party_id: sale.customer !== undefined ? customerIds[sale.customer] : null,
    created_by: userId,
    transaction_type: "SALE",
    payment_method: sale.method,
    payment_status: sale.method === "HUTANG" ? "BELUM_LUNAS" : "LUNAS",
    subtotal: total, discount: 0, total, paid_amount: paid, change_amount: 0,
    occurred_at: iso(sale.daysAgo, 11 + (sale.daysAgo % 6)),
  })));
  await insert("transaction_items", saleRows.flatMap(({ sale }, index) =>
    sale.lines.map((line) => ({
      business_id: businessId, transaction_id: sales[index].id, item_id: productIds[line.p],
      qty: line.q, unit_price: PRODUCTS[line.p].price, subtotal: line.q * PRODUCTS[line.p].price,
      cogs_at_sale: PRODUCTS[line.p].cogs,
    }))
  ));

  // Piutang dari penjualan hutang (satu di antaranya sudah dibayar sebagian).
  const creditSales = saleRows
    .map((row, index) => ({ ...row, id: sales[index].id }))
    .filter((row) => row.sale.method === "HUTANG");
  const receivables = creditSales.length
    ? await insert("receivables", creditSales.map((row, index) => {
        const paidAmount = index === 0 ? Math.round(row.total * 0.3) : 0;
        return {
          business_id: businessId, transaction_id: row.id, customer_id: customerIds[row.sale.customer!],
          amount: row.total, paid_amount: paidAmount,
          due_date: isoDate(row.sale.daysAgo - (row.sale.dueDays || 7)),
          status: paidAmount > 0 ? "SEBAGIAN" : "BELUM_LUNAS",
        };
      }))
    : [];
  if (receivables.length) {
    const first = creditSales[0];
    await insert("receivable_payments", [{
      business_id: businessId, receivable_id: receivables[0].id, amount: Math.round(first.total * 0.3),
      payment_method: "TUNAI", payment_date: iso(Math.max(0, first.sale.daysAgo - 1), 15), created_by: userId,
    }]);
  }

  // --- Pembelian bahan + utang supplier ---
  const purchaseRows = PURCHASES.map((purchase) => {
    const total = purchase.qty * purchase.price;
    const paid = Math.round(total * purchase.paidRatio);
    return { purchase, total, paid, status: paid >= total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM_LUNAS" };
  });
  const purchases = await insert("transactions", purchaseRows.map(({ purchase, total, paid, status }) => ({
    business_id: businessId, party_id: supplierIds[purchase.supplier], created_by: userId,
    transaction_type: "PURCHASE", payment_method: paid >= total ? "TUNAI" : "HUTANG", payment_status: status,
    subtotal: total, discount: 0, total, paid_amount: paid, change_amount: 0, occurred_at: iso(purchase.daysAgo, 9),
  })));
  await insert("transaction_items", purchaseRows.map(({ purchase }, index) => ({
    business_id: businessId, transaction_id: purchases[index].id, item_id: materialIds[purchase.material],
    qty: purchase.qty, unit_price: purchase.price, subtotal: purchase.qty * purchase.price, cogs_at_sale: purchase.price,
  })));
  await insert("payables", purchaseRows.map(({ purchase, total, paid, status }, index) => ({
    business_id: businessId, transaction_id: purchases[index].id, supplier_id: supplierIds[purchase.supplier],
    amount: total, paid_amount: paid, due_date: isoDate(purchase.daysAgo - 30), status,
  })));

  // --- Pengeluaran dan modal ---
  await insert("expenses", EXPENSES.map((expense) => ({
    business_id: businessId, category: expense.category, amount: expense.amount, expense_date: isoDate(expense.daysAgo),
    notes: expense.note, expense_type: expense.type, created_by: userId,
  })));
  await insert("capital_entries", CAPITAL.map((entry) => ({
    business_id: businessId, entry_type: entry.type, amount: entry.amount, entry_date: isoDate(entry.daysAgo),
    notes: entry.notes, created_by: userId,
  })));

  return {
    parties: parties.length,
    items: items.length,
    batches: batches.length,
    sales: sales.length,
    purchases: purchases.length,
    receivables: receivables.length,
    expenses: EXPENSES.length,
    capitalEntries: CAPITAL.length,
  };
}
