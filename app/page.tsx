"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  FileDown,
  FileText,
  History,
  LayoutDashboard,
  Leaf,
  LogOut,
  Minus,
  MoreHorizontal,
  Package,
  PanelLeft,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import * as XLSX from "xlsx";
import { backendRequest } from "@/lib/client-api";

type View = "dashboard" | "pos" | "products" | "materials" | "production" | "purchases" | "parties" | "receivables" | "expenses" | "reports" | "settings" | "guide" | "b2b-orders" | "b2b-deliveries" | "b2b-invoices" | "b2b-aging" | "cash-recon";
type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER" | "HUTANG";
type SettlementPaymentMethod = Exclude<PaymentMethod, "HUTANG">;
type Product = { id: string; name: string; category: string; stock: number; unit: string; price: number; cogs: number; emoji: string; active: boolean };
type Material = { id: string; name: string; stock: number; unit: string; lastBuy: number; supplier: string; active: boolean };
type CartItem = Product & { qty: number };
type Receivable = { id: string; customer: string; invoice: string; amount: number; paid: number; due: string };
type Expense = { id: string; date: string; category: string; amount: number; note: string; type?: "OPERATING" | "OWNER_WITHDRAWAL" };
type Purchase = { id: string; payableId?: string; date: string; supplier: string; total: number; paid: number; remaining: number; status: "LUNAS" | "SEBAGIAN" | "BELUM_LUNAS" };
type CapitalEntry = { id: string; date: string; type: "INITIAL" | "ADDITION" | "WITHDRAWAL"; amount: number; notes: string };
type Party = { id: string; name: string; type: "CUSTOMER" | "SUPPLIER"; phone: string; address: string; creditLimit: number };
type PnlReport = { revenue: number; cogs: number; gross_profit: number; expenses: number; net_profit: number; balance_sheet: { cash: number; inventory: number; receivables: number; payables: number; assets: number; equity: number } };
type SaleSummary = { id: string; date: string; total: number; cogs: number };
type Batch = { id: string; code: string; date: string; product: string; qty: number; cogs: number };
type Toast = { message: string; tone: "success" | "error" | "default" };
type B2BOrderItem = { id: string; item_id: string; qty: number; unit_price: number; subtotal: number; item_name?: string; unit_code?: string };
type SalesOrder = { id: string; customer_id: string; customer_name: string; customer_phone?: string; order_date: string; status: "DRAFT" | "CONFIRMED" | "DELIVERED" | "INVOICED" | "CANCELLED"; payment_terms_days: number; total_amount: number; notes: string; items: B2BOrderItem[] };
type DeliveryOrder = { id: string; sales_order_id: string; customer_name?: string; so_date?: string; delivery_date: string; status: "PENDING" | "DELIVERED"; notes: string; driver_name: string; items: Array<{ id: string; item_id: string; qty: number; item_name?: string; unit_code?: string }> };
type Invoice = { id: string; sales_order_id: string; delivery_order_id?: string; invoice_number: string; invoice_date: string; due_date: string; total_amount: number; paid_amount: number; status: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE"; notes: string; customer_name?: string; payments?: InvoicePayment[] };
type InvoicePayment = { id: string; invoice_id: string; payment_date: string; amount: number; payment_method: string; notes: string };
type AgingRow = { invoice_id: string; invoice_number: string; customer_name: string; invoice_date: string; due_date: string; total_amount: number; paid_amount: number; outstanding: number; days_overdue: number; age_bucket: string };
type SupplierReturn = { id: string; purchaseId: string; supplier: string; date: string; reason: string; total: number; notes: string };
type CashRecon = { id: string; date: string; systemCash: number; physicalCash: number; difference: number; notes: string; status: "open" | "verified" | "disputed" };
type PartialPaymentTarget = { kind: "receivable" | "payable" | "invoice"; id: string; title: string; remaining: number };

const demoProducts: Product[] = [
  { id: "p1", name: "Sambal Bawang 150g", category: "Sambal", stock: 42, unit: "jar", price: 28000, cogs: 13200, emoji: "SB", active: true },
  { id: "p2", name: "Chili Oil Original", category: "Minyak", stock: 18, unit: "botol", price: 35000, cogs: 16800, emoji: "CO", active: true },
  { id: "p3", name: "Sambal Matah", category: "Sambal", stock: 31, unit: "jar", price: 30000, cogs: 14100, emoji: "SM", active: true },
  { id: "p4", name: "Cireng Isi Ayam", category: "Frozen", stock: 9, unit: "pcs", price: 12000, cogs: 5400, emoji: "CI", active: true },
  { id: "p5", name: "Cireng Isi Keju", category: "Frozen", stock: 24, unit: "pcs", price: 13000, cogs: 6100, emoji: "CK", active: true },
  { id: "p6", name: "Sambal Ijo", category: "Sambal", stock: 5, unit: "jar", price: 29000, cogs: 13900, emoji: "SI", active: true },
  { id: "p7", name: "Minyak Bawang", category: "Minyak", stock: 12, unit: "botol", price: 24000, cogs: 10800, emoji: "MB", active: true },
  { id: "p8", name: "Paket Cicip", category: "Paket", stock: 7, unit: "pcs", price: 45000, cogs: 21700, emoji: "PC", active: true },
];

const demoMaterials: Material[] = [
  { id: "m1", name: "Cabai rawit merah", stock: 2.4, unit: "kg", lastBuy: 68000, supplier: "Pasar Segar Bu Ani", active: true },
  { id: "m2", name: "Minyak goreng premium", stock: 9, unit: "liter", lastBuy: 18500, supplier: "CV Sumber Pangan", active: true },
  { id: "m3", name: "Bawang putih", stock: 1.2, unit: "kg", lastBuy: 42000, supplier: "Pasar Segar Bu Ani", active: true },
  { id: "m4", name: "Gula pasir", stock: 4.5, unit: "kg", lastBuy: 17500, supplier: "CV Sumber Pangan", active: true },
  { id: "m5", name: "Garam halus", stock: 8, unit: "kg", lastBuy: 9500, supplier: "CV Sumber Pangan", active: true },
  { id: "m6", name: "Botol kaca 150ml", stock: 58, unit: "pcs", lastBuy: 2800, supplier: "Kemasan Kita", active: true },
  { id: "m7", name: "Label DapurKasir", stock: 170, unit: "pcs", lastBuy: 450, supplier: "Kemasan Kita", active: true },
];

const demoReceivables: Receivable[] = [
  { id: "r1", customer: "Warung Bu Tini", invoice: "INV-240821-04", amount: 420000, paid: 120000, due: "2026-08-27" },
  { id: "r2", customer: "Reseller Kak Nia", invoice: "INV-240819-09", amount: 315000, paid: 0, due: "2026-08-25" },
  { id: "r3", customer: "Kedai Pojok", invoice: "INV-240812-02", amount: 560000, paid: 560000, due: "2026-08-20" },
];

const demoExpenses: Expense[] = [
  { id: "e1", date: "2026-08-24", category: "Kemasan", amount: 185000, note: "Restock botol kaca dan label" },
  { id: "e2", date: "2026-08-23", category: "Transport", amount: 75000, note: "Ongkos kirim bahan" },
  { id: "e3", date: "2026-08-22", category: "Gas", amount: 230000, note: "Isi ulang tabung produksi" },
];

const demoPurchases: Purchase[] = [
  { id: "b1", date: "2026-08-24", supplier: "Pasar Segar Bu Ani", total: 486000, paid: 486000, remaining: 0, status: "LUNAS" },
  { id: "b2", date: "2026-08-22", supplier: "Kemasan Kita", total: 780000, paid: 280000, remaining: 500000, status: "SEBAGIAN" },
  { id: "b3", date: "2026-08-18", supplier: "CV Sumber Pangan", total: 1250000, paid: 1250000, remaining: 0, status: "LUNAS" },
];
const demoCapital: CapitalEntry[] = [{ id: "c1", date: "2026-08-01", type: "INITIAL", amount: 15000000, notes: "Modal awal usaha" }];
const demoSales: SaleSummary[] = [{ id: "s1", date: "2026-08-24", total: 4820000, cogs: 2265400 }];

const demoBatches: Batch[] = [
  { id: "bt1", code: "BATCH-240824-001", date: "2026-08-24", product: "Sambal Bawang 150g", qty: 50, cogs: 13200 },
  { id: "bt2", code: "BATCH-240823-002", date: "2026-08-23", product: "Chili Oil Original", qty: 30, cogs: 16800 },
  { id: "bt3", code: "BATCH-240821-001", date: "2026-08-21", product: "Sambal Matah", qty: 40, cogs: 14100 },
];

const BACKEND_ENABLED = process.env.NEXT_PUBLIC_BACKEND_ENABLED === "true";
// Alat bantu trial (isi/hapus data dummy). Set NEXT_PUBLIC_TRIAL_TOOLS=false sebelum serah terima ke client.
const TRIAL_TOOLS = process.env.NEXT_PUBLIC_TRIAL_TOOLS !== "false";

type BusinessProfile = { name: string; phone: string; address: string; receipt_footer: string; paper_width: 58 | 80 };
type PlanState = { name: "FREE" | "PRO"; salesLimit: number; productLimit: number; materialLimit: number };
const defaultPlan: PlanState = { name: "FREE", salesLimit: 50, productLimit: 30, materialLimit: 10 };
const defaultBusinessProfile: BusinessProfile = { name: "DapurKasir", phone: "", address: "", receipt_footer: "Terima kasih sudah mendukung usaha lokal.", paper_width: 58 };

type DashboardData = {
  today: { revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number };
  plan: { salesCount: number; productCount: number; materialCount: number };
  salesTrend?: Array<{ date: string; total: number }>;
  criticalMaterials: Array<{ id: string; name: string; stock: number; unit: string }>;
  dueReceivables: Array<{ customer: string; remaining: number; dueDate: string }>;
  recentActivity: {
    sales: Array<{ id: string; total: number; date: string; method: string }>;
    batches: Array<{ id: string; code: string; product: string; qty: number; cogs: number; date: string }>;
    purchases: Array<{ id: string; total: number; supplier: string; date: string }>;
  };
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value).replace("Rp", "Rp ");
const shortRupiah = (value: number) => value >= 1000000 ? `Rp ${(value / 1000000).toFixed(1).replace(".", ",")} jt` : value >= 1000 ? `Rp ${(value / 1000).toFixed(0)} rb` : rupiah(value);
const dateLabel = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const initials = (value: string) => value.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

type ImportKind = "PRODUCT" | "RAW_MATERIAL";

function downloadItemTemplate(kind: ImportKind) {
  const rows = kind === "PRODUCT"
    ? [{ nama: "Sambal Bawang 150g", kategori: "Sambal", satuan: "jar", stok_awal: 0, harga_jual: 28000 }]
    : [{ nama: "Cabai rawit merah", satuan: "kg", stok_awal: 0, harga_beli_terakhir: 68000 }];
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({ wch: Math.max(16, key.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, kind === "PRODUCT" ? "Produk Jadi" : "Bahan Baku");
  XLSX.writeFile(workbook, kind === "PRODUCT" ? "template-import-produk.xlsx" : "template-import-bahan-baku.xlsx");
}

const CASHIER_VIEWS: View[] = ["pos", "settings"];

const navSections = [
  { label: "Workspace", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { id: "pos", label: "Kasir POS", icon: ShoppingCart }] },
  { label: "B2B", items: [{ id: "b2b-orders", label: "Sales Order", icon: FileText }, { id: "b2b-deliveries", label: "Surat Jalan", icon: Truck }, { id: "b2b-invoices", label: "Invoice", icon: Receipt }, { id: "b2b-aging", label: "Aging Piutang", icon: Clock3 }] },
  { label: "Operasional", items: [{ id: "products", label: "Produk Jadi", icon: Package }, { id: "materials", label: "Bahan Baku", icon: Leaf }, { id: "production", label: "Produksi Batch", icon: Boxes }, { id: "purchases", label: "Pembelian", icon: Truck }, { id: "parties", label: "Pelanggan & Supplier", icon: Users }] },
  { label: "Keuangan", items: [{ id: "receivables", label: "Piutang", icon: WalletCards }, { id: "expenses", label: "Pengeluaran", icon: CircleDollarSign }, { id: "cash-recon", label: "Rekonsiliasi Kas", icon: ClipboardList }, { id: "reports", label: "Laporan", icon: BarChart3 }] },
  { label: "Bantuan", items: [{ id: "guide", label: "Panduan", icon: BookOpen }] },
];

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [capitalEntries, setCapitalEntries] = useState<CapitalEntry[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [payables, setPayables] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [salesCount, setSalesCount] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [businessName, setBusinessName] = useState("DapurKasir");
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(defaultBusinessProfile);
  const [plan, setPlan] = useState<PlanState>(defaultPlan);
  const [account, setAccount] = useState<{ name: string; role: "OWNER" | "KASIR" }>({ name: "Owner", role: "OWNER" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);
  const [cashRecons, setCashRecons] = useState<CashRecon[]>([]);
  const [modal, setModal] = useState<"product" | "material" | "payment" | "expense" | "production" | "purchase" | "capital" | "party" | "receipt" | "b2b-order" | "b2b-delivery" | "b2b-invoice" | "return" | "cash-recon" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastSale, setLastSale] = useState<{ id: string; subtotal: number; discount: number; total: number; method: PaymentMethod; paid: number; change: number; items: CartItem[] } | null>(null);
  const [dark, setDark] = useState(false);
  const [b2bOrders, setB2bOrders] = useState<SalesOrder[]>([]);
  const [b2bDeliveries, setB2bDeliveries] = useState<DeliveryOrder[]>([]);
  const [b2bInvoices, setB2bInvoices] = useState<Invoice[]>([]);
  const [b2bAging, setB2bAging] = useState<AgingRow[]>([]);
  const [b2bSelectedSO, setB2bSelectedSO] = useState<SalesOrder | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [partialPayment, setPartialPayment] = useState<PartialPaymentTarget | null>(null);

  useEffect(() => {
    if (BACKEND_ENABLED) {
      // Clean up anything a pre-fix build left behind in this browser.
      window.localStorage.removeItem("dapurkasir-demo");
      return;
    }
    const stored = window.localStorage.getItem("dapurkasir-demo");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.materials) setMaterials(parsed.materials);
        if (parsed.receivables) setReceivables(parsed.receivables);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.purchases) setPurchases(parsed.purchases);
        if (parsed.batches) setBatches(parsed.batches);
        if (parsed.capitalEntries) setCapitalEntries(parsed.capitalEntries);
        if (parsed.payables) setPayables(parsed.payables);
        if (parsed.sales) setSales(parsed.sales);
        if (typeof parsed.salesCount === "number") setSalesCount(parsed.salesCount);
        if (parsed.supplierReturns) setSupplierReturns(parsed.supplierReturns);
        if (parsed.cashRecons) setCashRecons(parsed.cashRecons);
      } catch { /* use seed data when local state is malformed */ }
    }
  }, []);

  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    // Fetch dashboard data
    backendRequest<DashboardData>("/api/dashboard").then((data) => {
      setDashboardData(data);
      if (data.plan) setSalesCount(data.plan.salesCount);
    }).catch(() => undefined);
    backendRequest<{ name?: string; role?: string }>("/api/auth/session").then((data) => {
      const role = data?.role === "KASIR" ? "KASIR" : "OWNER";
      setAccount({ name: String(data?.name || "Owner"), role });
      if (role === "KASIR") setView((current) => (CASHIER_VIEWS.includes(current) ? current : "pos"));
    }).catch(() => undefined);
    // Fetch plan and usage limits — never hardcode these, PRO businesses depend on this being real.
    backendRequest<{ currentPlan: string; limits: { salesLimit: number; productLimit: number; materialLimit: number } }>("/api/subscription").then((data) => {
      setPlan({ name: data.currentPlan === "PRO" ? "PRO" : "FREE", salesLimit: data.limits.salesLimit, productLimit: data.limits.productLimit, materialLimit: data.limits.materialLimit });
    }).catch(() => undefined);
    // Fetch bootstrap data
    backendRequest<{ business?: Record<string, unknown>; customers?: Array<Record<string, unknown>>; suppliers?: Array<Record<string, unknown>>; products?: Array<Record<string, unknown>>; materials?: Array<Record<string, unknown>>; receivables?: Array<Record<string, unknown>>; expenses?: Array<Record<string, unknown>>; purchases?: Array<Record<string, unknown>>; batches?: Array<Record<string, unknown>>; batchOutputs?: Array<Record<string, unknown>>; payables?: Array<Record<string, unknown>>; capitalEntries?: Array<Record<string, unknown>>; sales?: Array<Record<string, unknown>>; saleItems?: Array<Record<string, unknown>>; supplierReturns?: Array<Record<string, unknown>>; cashReconciliations?: Array<Record<string, unknown>> }>("/api/bootstrap").then((data) => {
      if (data.business?.name) setBusinessName(String(data.business.name));
      if (data.business) setBusinessProfile({ name: String(data.business.name || ""), phone: String(data.business.phone || ""), address: String(data.business.address || ""), receipt_footer: String(data.business.receipt_footer || ""), paper_width: Number(data.business.paper_width) === 80 ? 80 : 58 });
      if (data.products) setProducts(data.products.map((item) => ({ id: String(item.id), name: String(item.name), category: String(item.category || "Lainnya"), stock: Number(item.stock_qty || 0), unit: String((item.units as { code?: string } | undefined)?.code || "pcs"), price: Number(item.sale_price || 0), cogs: Number(item.last_cogs || 0), emoji: initials(String(item.name)), active: Boolean(item.is_active) })));
      if (data.materials) setMaterials(data.materials.map((item) => ({ id: String(item.id), name: String(item.name), stock: Number(item.stock_qty || 0), unit: String((item.units as { code?: string } | undefined)?.code || "pcs"), lastBuy: Number(item.last_buy_price || 0), supplier: "Supplier tersimpan", active: Boolean(item.is_active) })));
      if (data.receivables) setReceivables(data.receivables.map((item) => ({ id: String(item.id), customer: String((item.parties as { name?: string } | undefined)?.name || "Pelanggan"), invoice: String(item.transaction_id || ""), amount: Number(item.amount || 0), paid: Number(item.paid_amount || 0), due: String(item.due_date) })));
      if (data.expenses) setExpenses(data.expenses.map((item) => ({ id: String(item.id), date: String(item.expense_date), category: String(item.category), amount: Number(item.amount || 0), note: String(item.notes || ""), type: String(item.expense_type || "OPERATING") as Expense["type"] })));
      if (data.batches) {
        const outputsByBatch = new Map<string, Array<{name: string; qty: number}>>();
        if (data.batchOutputs) {
          for (const o of data.batchOutputs) {
            const bid = String(o.batch_id);
            if (!outputsByBatch.has(bid)) outputsByBatch.set(bid, []);
            outputsByBatch.get(bid)!.push({ name: String((o.items as { name?: string } | undefined)?.name || 'Produk'), qty: Number(o.qty || 0) });
          }
        }
        setBatches(data.batches.map((item) => {
          const outs = outputsByBatch.get(String(item.id));
          const product = outs && outs.length > 1 ? outs.map((o) => `${o.name} ${o.qty}`).join(', ') : String((item.items as { name?: string } | undefined)?.name || 'Produk');
          return { id: String(item.id), code: String(item.batch_code), date: String(item.produced_at).slice(0, 10), product, qty: Number(item.output_qty || 0), cogs: Number(item.cogs_per_unit || 0) };
        }));
      }
      if (data.capitalEntries) setCapitalEntries(data.capitalEntries.map((item) => ({ id: String(item.id), date: String(item.entry_date), type: String(item.entry_type) as CapitalEntry["type"], amount: Number(item.amount || 0), notes: String(item.notes || "") })));
      if (data.payables) setPayables(data.payables.map((item) => ({ id: String(item.id), date: String(item.updated_at || "").slice(0, 10), supplier: String((item.parties as { name?: string } | undefined)?.name || "Supplier"), total: Number(item.amount || 0), paid: Number(item.paid_amount || 0), remaining: Number(item.amount || 0) - Number(item.paid_amount || 0), status: String(item.status) as Purchase["status"] })));
      if (data.purchases) setPurchases(data.purchases.map((item) => { const payable = data.payables?.find((entry) => String(entry.transaction_id) === String(item.id)); const total = Number(item.total || 0); const paid = payable ? Number(payable.paid_amount || 0) : Number(item.paid_amount || 0); return { id: String(item.id), payableId: payable ? String(payable.id) : undefined, date: String(item.occurred_at || "").slice(0, 10), supplier: String((item.parties as { name?: string } | undefined)?.name || "Supplier"), total, paid, remaining: Math.max(0, total - paid), status: paid >= total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM_LUNAS" } as Purchase; }));
      if (data.sales) setSales(data.sales.map((item) => ({ id: String(item.id), date: String(item.occurred_at || "").slice(0, 10), total: Number(item.total || 0), cogs: 0 })));
      const mapParty = (item: Record<string, unknown>): Party => ({ id: String(item.id), name: String(item.name), type: String(item.party_type) === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER", phone: String(item.phone || ""), address: String(item.address || ""), creditLimit: Number(item.credit_limit || 0) });
      if (data.customers || data.suppliers) setParties([...(data.customers || []).map(mapParty), ...(data.suppliers || []).map(mapParty)]);
      if (data.supplierReturns) setSupplierReturns(data.supplierReturns.map((item) => ({ id: String(item.id), purchaseId: String(item.purchase_id), supplier: String((item.parties as { name?: string } | undefined)?.name || "Supplier"), date: String(item.return_date), reason: String(item.reason || ""), total: Number(item.total || 0), notes: String(item.notes || "") })));
      if (data.cashReconciliations) setCashRecons(data.cashReconciliations.map((item) => ({ id: String(item.id), date: String(item.reconciliation_date), systemCash: Number(item.system_cash || 0), physicalCash: Number(item.physical_cash || 0), difference: Number(item.difference || 0), notes: String(item.notes || ""), status: String(item.status || "open") as CashRecon["status"] })));
    }).catch(() => undefined);
    // Fetch B2B data
    backendRequest<unknown[]>("/api/b2b/sales-orders").then((rows) => {
      setB2bOrders((rows as Record<string, unknown>[]).map((row) => {
        const party = row.parties as { name?: string; phone?: string } | undefined;
        const items = (row.sales_order_items as Array<Record<string, unknown>> || []).map((it) => {
          const item = it.items as { name?: string; units?: { code?: string } } | undefined;
          return { id: String(it.id), item_id: String(it.item_id), qty: Number(it.qty), unit_price: Number(it.unit_price), subtotal: Number(it.subtotal), item_name: item?.name || "", unit_code: item?.units?.code || "" };
        });
        return { id: String(row.id), customer_id: String(row.customer_id), customer_name: party?.name || "", customer_phone: party?.phone || "", order_date: String(row.order_date), status: String(row.status) as SalesOrder["status"], payment_terms_days: Number(row.payment_terms_days), total_amount: Number(row.total_amount), notes: String(row.notes || ""), items };
      }));
    }).catch(() => undefined);
    backendRequest<unknown[]>("/api/b2b/delivery-orders").then((rows) => {
      setB2bDeliveries((rows as Record<string, unknown>[]).map((row) => {
        const so = row.sales_orders as { order_date?: string; parties?: { name?: string } } | undefined;
        const items = (row.delivery_order_items as Array<Record<string, unknown>> || []).map((it) => {
          const item = it.items as { name?: string; units?: { code?: string } } | undefined;
          return { id: String(it.id), item_id: String(it.item_id), qty: Number(it.qty), item_name: item?.name || "", unit_code: item?.units?.code || "" };
        });
        return { id: String(row.id), sales_order_id: String(row.sales_order_id), customer_name: so?.parties?.name || "", so_date: so?.order_date || "", delivery_date: String(row.delivery_date), status: String(row.status) as DeliveryOrder["status"], notes: String(row.notes || ""), driver_name: String(row.driver_name || ""), items };
      }));
    }).catch(() => undefined);
    backendRequest<unknown[]>("/api/b2b/invoices").then((rows) => {
      setB2bInvoices((rows as Record<string, unknown>[]).map((row) => {
        const so = row.sales_orders as { order_date?: string; parties?: { name?: string; phone?: string } } | undefined;
        return { id: String(row.id), sales_order_id: String(row.sales_order_id), delivery_order_id: row.delivery_order_id ? String(row.delivery_order_id) : undefined, invoice_number: String(row.invoice_number), invoice_date: String(row.invoice_date), due_date: String(row.due_date), total_amount: Number(row.total_amount), paid_amount: Number(row.paid_amount), status: String(row.status) as Invoice["status"], notes: String(row.notes || ""), customer_name: so?.parties?.name || "" };
      }));
    }).catch(() => undefined);
    backendRequest<unknown[]>("/api/b2b/aging").then((rows) => {
      setB2bAging((rows as Record<string, unknown>[]).map((row) => ({
        invoice_id: String(row.invoice_id), invoice_number: String(row.invoice_number), customer_name: String(row.customer_name), invoice_date: String(row.invoice_date), due_date: String(row.due_date), total_amount: Number(row.total_amount), paid_amount: Number(row.paid_amount), outstanding: Number(row.outstanding), days_overdue: Number(row.days_overdue), age_bucket: String(row.age_bucket),
      })));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    // Midtrans redirects back here with ?payment=success|pending|failed after checkout.
    const status = new URLSearchParams(window.location.search).get("payment");
    if (!status) return;
    window.history.replaceState(null, "", window.location.pathname);
    setView("settings");
    if (status === "success") notify("Pembayaran berhasil. Paket PRO sedang diaktifkan — muncul dalam beberapa saat.");
    else if (status === "pending") notify("Pembayaran sedang diproses. Status akan diperbarui otomatis.", "default");
    else notify("Pembayaran belum berhasil. Silakan coba lagi dari halaman harga.", "error");
  }, []);

  useEffect(() => {
    // Demo-mode persistence only — real business data comes from the backend on
    // every load and must never sit in localStorage, which is shared across
    // whichever account is logged in on this device (e.g. a shared cashier tablet).
    if (BACKEND_ENABLED) return;
    window.localStorage.setItem("dapurkasir-demo", JSON.stringify({ products, materials, receivables, expenses, purchases, batches, capitalEntries, payables, sales, salesCount, supplierReturns, cashRecons }));
  }, [products, materials, receivables, expenses, purchases, batches, capitalEntries, payables, sales, salesCount, supplierReturns, cashRecons]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const notify = (message: string, tone: Toast["tone"] = "success") => setToast({ message, tone });
  const navigate = (next: View) => setView(next);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const dueReceivables = receivables.reduce((sum, item) => sum + Math.max(0, item.amount - item.paid), 0);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...current, { ...product, qty: 1 }];
    });
  };

  const changeCartQty = (id: string, delta: number) => {
    setCart((current) => current.flatMap((item) => item.id === id ? (item.qty + delta <= 0 ? [] : [{ ...item, qty: item.qty + delta }]) : [item]));
  };

  const openCreate = (kind: "product" | "material" | "expense" | "production" | "purchase" | "capital" | "party" | "b2b-order" | "b2b-delivery" | "b2b-invoice" | "return" | "cash-recon") => setModal(kind);

  const saveBusinessProfile = async (profile: BusinessProfile) => {
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/business/profile", { method: "PATCH", body: JSON.stringify(profile) }); }
      catch (error) { notify(error instanceof Error ? error.message : "Profil usaha gagal disimpan.", "error"); throw error; }
    }
    setBusinessProfile(profile);
    setBusinessName(profile.name);
    notify("Profil usaha berhasil disimpan.");
  };

  const handlePayment = async (method: PaymentMethod, cash: number, customer: string, dueDate: string, override: string, discountValue: number) => {
    if (!cart.length) return notify("Keranjang masih kosong.", "error");
    if (plan.name !== "PRO" && salesCount >= plan.salesLimit) return notify(`Batas ${plan.salesLimit} transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.`, "error");
    const shortage = cart.filter((item) => item.qty > item.stock);
    if (shortage.length && (!override || override.trim().length < 5)) return notify(`Stok ${shortage[0].name} tidak mencukupi. Owner perlu alasan override minimal 5 karakter.`, "error");
    const subtotal = cartTotal;
    const finalDiscount = Math.max(0, Math.min(discountValue, subtotal));
    const total = subtotal - finalDiscount;
    if (method === "TUNAI" && cash < total) return notify(`Pembayaran kurang ${rupiah(total - cash)}.`, "error");
    if (method === "HUTANG" && (!customer || !dueDate)) return notify("Pilih pelanggan dan tanggal jatuh tempo untuk penjualan hutang.", "error");
    const saleId = `TRX-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(salesCount + 1).padStart(3, "0")}`;
    const paid = method === "TUNAI" ? cash : method === "HUTANG" ? 0 : total;
    const change = method === "TUNAI" ? cash - total : 0;
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/pos/checkout", { method: "POST", body: JSON.stringify({ payment_method: method, customer_name: customer, due_date: dueDate, paid_amount: paid, discount: finalDiscount, override_reason: override || null, items: cart.map((item) => ({ item_id: item.id, qty: item.qty, unit_price: item.price })) }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Transaksi gagal diproses.", "error"); }
    }
    setProducts((current) => current.map((product) => {
      const sold = cart.find((item) => item.id === product.id);
      return sold ? { ...product, stock: product.stock - sold.qty } : product;
    }));
    setSales((current) => [{ id: saleId, date: new Date().toISOString().slice(0, 10), total, cogs: cart.reduce((sum, item) => sum + item.cogs * item.qty, 0) }, ...current]);
    if (method === "HUTANG") setReceivables((current) => [{ id: `r-${Date.now()}`, customer, invoice: saleId, amount: total, paid: 0, due: dueDate }, ...current]);
    setSalesCount((count) => count + 1);
    setLastSale({ id: saleId, subtotal, discount: finalDiscount, total, method, paid, change, items: cart });
    setCart([]);
    setDiscount(0);
    setModal("receipt");
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>, kind: "product" | "material") => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const unit = String(form.get("unit") || "");
    const stock = Number(form.get("stock") || 0);
    const price = Number(form.get("price") || 0);
    if (!name) return notify("Nama item wajib diisi.", "error");
    if (!unit) return notify("Pilih satuan item terlebih dahulu.", "error");
    if (stock < 0 || price < 0) return notify("Nilai stok dan harga tidak boleh kurang dari 0.", "error");
    if (kind === "product" && plan.name !== "PRO" && products.length >= plan.productLimit) return notify(`Batas ${plan.productLimit} produk paket Gratis telah tercapai. Upgrade ke PRO untuk menambah produk.`, "error");
    if (kind === "material" && plan.name !== "PRO" && materials.length >= plan.materialLimit) return notify(`Batas ${plan.materialLimit} bahan baku paket Gratis telah tercapai. Upgrade ke PRO untuk menambah bahan.`, "error");
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/items", { method: "POST", body: JSON.stringify({ name, unit_code: unit, stock_qty: stock, sale_price: kind === "product" ? price : 0, last_buy_price: kind === "material" ? price : 0, category: String(form.get("category") || "Lainnya"), item_type: kind === "product" ? "PRODUCT" : "RAW_MATERIAL" }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Item gagal disimpan.", "error"); }
    }
    if (kind === "product") {
      setProducts((current) => [{ id: `p-${Date.now()}`, name, category: String(form.get("category") || "Lainnya"), stock, unit, price, cogs: 0, emoji: initials(name), active: true }, ...current]);
      notify("Produk baru berhasil ditambahkan.");
    } else {
      setMaterials((current) => [{ id: `m-${Date.now()}`, name, stock, unit, lastBuy: price, supplier: String(form.get("supplier") || "Belum ada supplier"), active: true }, ...current]);
      notify("Bahan baku baru berhasil ditambahkan.");
    }
    setModal(null);
  };

  const createParty = async (name: string, type: Party["type"], details: Partial<Pick<Party, "phone" | "address" | "creditLimit">> = {}) => {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const existing = parties.find((party) => party.type === type && party.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing.name;
    let id = `pt-${Date.now()}`;
    if (BACKEND_ENABLED) {
      try {
        const rows = await backendRequest<Array<{ id: string }>>("/api/parties", { method: "POST", body: JSON.stringify({ name: cleanName, party_type: type, phone: details.phone || "", address: details.address || "", credit_limit: details.creditLimit || 0 }) });
        if (rows?.[0]?.id) id = String(rows[0].id);
      } catch (error) { notify(error instanceof Error ? error.message : "Data gagal disimpan.", "error"); return null; }
    }
    setParties((current) => [{ id, name: cleanName, type, phone: details.phone || "", address: details.address || "", creditLimit: details.creditLimit || 0 }, ...current]);
    return cleanName;
  };

  const saveParty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const type = String(form.get("partyType") || "CUSTOMER") as Party["type"];
    const creditLimit = Number(form.get("creditLimit") || 0);
    if (!name) return notify("Nama wajib diisi.", "error");
    if (creditLimit < 0) return notify("Limit piutang tidak boleh negatif.", "error");
    await createParty(name, type, { phone: String(form.get("phone") || ""), address: String(form.get("address") || ""), creditLimit });
    setModal(null);
    notify(type === "CUSTOMER" ? "Pelanggan berhasil ditambahkan." : "Supplier berhasil ditambahkan.");
  };

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    if (!form.get("category") || amount <= 0 || !form.get("date")) return notify("Kategori, nominal, dan tanggal wajib diisi dengan benar.", "error");
    const type = String(form.get("expenseType") || "OPERATING") as Expense["type"];
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/expenses", { method: "POST", body: JSON.stringify({ category: String(form.get("category")), amount, expense_date: String(form.get("date")), expense_type: type, notes: String(form.get("note") || "") }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Pengeluaran gagal disimpan.", "error"); }
    }
    setExpenses((current) => [{ id: `e-${Date.now()}`, date: String(form.get("date")), category: String(form.get("category")), amount, note: String(form.get("note") || ""), type }, ...current]);
    setModal(null);
    notify("Pengeluaran berhasil dicatat.");
  };

  const saveProduction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const outputIds = form.getAll("output").map(String);
    const outputQtys = form.getAll("outputQty").map(Number);
    const materialIds = form.getAll("material").map(String);
    const materialQtys = form.getAll("materialQty").map(Number);
    const otherCost = Number(form.get("otherCost") || 0);
    const outputs = outputIds.map((id, i) => ({ product: products.find((item) => item.id === id), qty: outputQtys[i] })).filter((o) => o.product && o.qty > 0);
    const rows = materialIds.map((id, index) => ({ material: materials.find((item) => item.id === id), qty: materialQtys[index] }));
    if (!outputs.length || !rows.length || rows.some((row) => !row.material || row.qty <= 0)) return notify("Pilih minimal satu output dan satu bahan dengan kuantitas valid.", "error");
    if (rows.some((row) => row.material!.stock < row.qty)) return notify("Stok salah satu bahan tidak mencukupi.", "error");
    const materialCost = rows.reduce((sum, row) => sum + row.qty * row.material!.lastBuy, 0);
    const totalOutputQty = outputs.reduce((sum, o) => sum + o.qty, 0);
    const cogs = Math.round(((materialCost + Math.max(0, otherCost)) / totalOutputQty) * 100) / 100;
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/production/batch", { method: "POST", body: JSON.stringify({ outputs: outputs.map((o) => ({ item_id: o.product!.id, qty: o.qty })), other_cost: otherCost, materials: rows.map((row) => ({ item_id: row.material!.id, qty_used: row.qty })) }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Batch gagal disimpan.", "error"); }
    }
    setMaterials((current) => current.map((item) => { const row = rows.find((candidate) => candidate.material!.id === item.id); return row ? { ...item, stock: item.stock - row.qty } : item; }));
    setProducts((current) => current.map((item) => { const out = outputs.find((o) => o.product!.id === item.id); return out ? { ...item, stock: item.stock + out.qty, cogs } : item; }));
    const outLabel = outputs.map((o) => `${o.product!.name} ${o.qty}`).join(", ");
    setBatches((current) => [{ id: `bt-${Date.now()}`, code: `BATCH-${new Date().toISOString().slice(0, 10).replaceAll("-", "").slice(2)}-${String(current.length + 1).padStart(3, "0")}`, date: new Date().toISOString().slice(0, 10), product: outLabel, qty: totalOutputQty, cogs }, ...current]);
    setModal(null);
    notify(`Batch selesai! ${outLabel} — HPP ${rupiah(cogs)}/unit.`);
  };

  const savePurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const materialId = String(form.get("material") || "");
    const qty = Number(form.get("qty") || 0);
    const price = Number(form.get("price") || 0);
    const material = materials.find((item) => item.id === materialId);
    const paid = Number(form.get("paid") || 0);
    if (!material || qty <= 0 || price < 0 || paid < 0 || !form.get("supplier")) return notify("Supplier, bahan, kuantitas, dan harga wajib diisi dengan benar.", "error");
    const total = qty * price;
    if (paid > total) return notify("Pembayaran awal tidak boleh melebihi total.", "error");
    const status = paid >= total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM_LUNAS";
    let payableId: string | undefined;
    if (BACKEND_ENABLED) {
      try { const result = await backendRequest<{ payable_id?: string }>("/api/purchases", { method: "POST", body: JSON.stringify({ supplier_name: String(form.get("supplier")), payment_status: status, paid_amount: paid, payment_method: String(form.get("paymentMethod") || "TUNAI"), items: [{ item_id: materialId, qty, price }] }) }); payableId = result.payable_id; }
      catch (error) { return notify(error instanceof Error ? error.message : "Pembelian gagal disimpan.", "error"); }
    }
    setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, stock: item.stock + qty, lastBuy: price, supplier: String(form.get("supplier")) } : item));
    const purchase = { id: `b-${Date.now()}`, payableId, date: new Date().toISOString().slice(0, 10), supplier: String(form.get("supplier")), total, paid, remaining: total - paid, status } as Purchase;
    setPurchases((current) => [purchase, ...current]); setPayables((current) => status === "LUNAS" ? current : [purchase, ...current]);
    setModal(null);
    notify(`Pembelian ${rupiah(total)} berhasil dicatat.`);
  };

  const saveCapital = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const amount = Number(form.get("amount") || 0); const type = String(form.get("type")) as CapitalEntry["type"]; const date = String(form.get("date") || "");
    if (!amount || amount <= 0 || !date) return notify("Jenis, nominal, dan tanggal modal wajib diisi.", "error");
    if (BACKEND_ENABLED) try { await backendRequest("/api/capital", { method: "POST", body: JSON.stringify({ entry_type: type, amount, entry_date: date, notes: String(form.get("note") || "") }) }); } catch (error) { return notify(error instanceof Error ? error.message : "Modal gagal disimpan.", "error"); }
    setCapitalEntries((current) => [{ id: `c-${Date.now()}`, date, type, amount, notes: String(form.get("note") || "") }, ...current]); setModal(null); notify("Transaksi modal berhasil dicatat.");
  };

  const openPayablePayment = (id: string) => {
    const payable = payables.find((item) => item.id === id);
    if (!payable || payable.remaining <= 0) return;
    setPartialPayment({ kind: "payable", id, title: `Utang ${payable.supplier}`, remaining: payable.remaining });
  };

  const openReceivablePayment = (id: string) => {
    const receivable = receivables.find((item) => item.id === id);
    if (!receivable) return;
    const remaining = receivable.amount - receivable.paid;
    if (remaining <= 0) return;
    setPartialPayment({ kind: "receivable", id, title: `Piutang ${receivable.customer}`, remaining });
  };

  const uploadPaymentProof = async (file: File | null) => {
    if (!file) return "";
    if (!BACKEND_ENABLED) return "";
    const formData = new FormData();
    formData.append("file", file);
    const result = await backendRequest<{ url: string }>("/api/upload/payment-proof", { method: "POST", body: formData });
    return result.url;
  };

  const savePartialPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partialPayment) return;

    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    const paymentMethod = String(form.get("paymentMethod") || "TUNAI") as SettlementPaymentMethod;
    const notes = String(form.get("notes") || "");
    const file = form.get("proof") instanceof File && (form.get("proof") as File).size > 0 ? form.get("proof") as File : null;

    if (!amount || amount <= 0 || amount > partialPayment.remaining) return notify("Nominal pembayaran tidak valid.", "error");

    try {
      const payment_proof_url = await uploadPaymentProof(file);
      if (BACKEND_ENABLED) {
        const endpoint = partialPayment.kind === "payable"
          ? `/api/payables/${partialPayment.id}/pay`
          : partialPayment.kind === "receivable"
            ? `/api/receivables/${partialPayment.id}/pay`
            : `/api/b2b/invoices/${partialPayment.id}/pay`;
        await backendRequest(endpoint, { method: "POST", body: JSON.stringify({ amount, payment_method: paymentMethod, notes, payment_proof_url }) });
      }
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Pembayaran gagal disimpan.", "error");
    }

    if (partialPayment.kind === "payable") {
      setPayables((current) => current.map((item) => item.id === partialPayment.id ? { ...item, paid: item.paid + amount, remaining: item.remaining - amount, status: item.remaining - amount <= 0 ? "LUNAS" : "SEBAGIAN" } : item));
      setPurchases((current) => current.map((item) => item.payableId === partialPayment.id ? { ...item, paid: item.paid + amount, remaining: item.remaining - amount, status: item.remaining - amount <= 0 ? "LUNAS" : "SEBAGIAN" } : item));
    } else if (partialPayment.kind === "receivable") {
      setReceivables((current) => current.map((item) => item.id === partialPayment.id ? { ...item, paid: item.paid + amount } : item));
    } else {
      setB2bInvoices((prev) => prev.map((inv) => {
        if (inv.id !== partialPayment.id) return inv;
        const newPaid = inv.paid_amount + amount;
        return { ...inv, paid_amount: newPaid, status: newPaid >= inv.total_amount ? "PAID" : "PARTIAL" };
      }));
    }

    setPartialPayment(null);
    notify(`Pembayaran ${rupiah(amount)} dicatat.`);
  };

  const sendWhatsApp = (phone: string, message: string) => {
    const clean = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    if (!clean) return notify("Nomor WhatsApp pelanggan belum diisi.", "error");
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const saveSupplierReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const purchaseId = String(form.get("purchase") || "");
    const materialId = String(form.get("material") || "");
    const qty = Number(form.get("qty") || 0);
    const supplierId = String(form.get("supplier") || "");
    const reason = String(form.get("reason") || "Retur barang");
    const notes = String(form.get("notes") || "");
    const material = materials.find((item) => item.id === materialId);
    if (!purchaseId || !material || qty <= 0) return notify("Pembelian, bahan, dan kuantitas retur wajib diisi.", "error");
    const total = qty * material.lastBuy;
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/supplier-returns", { method: "POST", body: JSON.stringify({ purchase_id: purchaseId, supplier_id: supplierId || null, reason, notes, items: [{ item_id: materialId, qty }] }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Retur gagal disimpan.", "error"); }
    }
    const supplier = parties.find((p) => p.id === supplierId)?.name || "Supplier";
    setSupplierReturns((current) => [{ id: `rt-${Date.now()}`, purchaseId, supplier, date: new Date().toISOString().slice(0, 10), reason, total, notes }, ...current]);
    setMaterials((current) => current.map((item) => item.id === materialId ? { ...item, stock: item.stock - qty } : item));
    setModal(null);
    notify(`Retur ${material.name} ${qty} ${material.unit} tercatat, stok berkurang.`);
  };

  const saveCashReconciliation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date") || "");
    const systemCash = Number(form.get("systemCash") || 0);
    const physicalCash = Number(form.get("physicalCash") || 0);
    const notes = String(form.get("notes") || "");
    if (!date) return notify("Tanggal rekonsiliasi wajib diisi.", "error");
    const difference = physicalCash - systemCash;
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/cash-reconciliation", { method: "POST", body: JSON.stringify({ reconciliation_date: date, system_cash: systemCash, physical_cash: physicalCash, notes }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Rekonsiliasi gagal disimpan.", "error"); }
    }
    setCashRecons((current) => [{ id: `cr-${Date.now()}`, date, systemCash, physicalCash, difference, notes, status: "open" }, ...current.filter((item) => item.date !== date)]);
    setModal(null);
    notify(difference === 0 ? "Kas seimbang. Rekonsiliasi tersimpan." : `Rekonsiliasi tersimpan. Selisih ${rupiah(difference)}.`);
  };

  const saveB2BOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerId = String(form.get("customer") || "");
    const terms = Number(form.get("paymentTerms") || 30);
    const notes = String(form.get("notes") || "");
    const itemIds = form.getAll("itemId").map(String);
    const itemQtys = form.getAll("itemQty").map(Number);
    const itemPrices = form.getAll("itemPrice").map(Number);
    if (!customerId) return notify("Pilih pelanggan.", "error");
    const items = itemIds.map((id, i) => ({ item_id: id, qty: itemQtys[i], unit_price: itemPrices[i] })).filter((it) => it.item_id && it.qty > 0);
    if (!items.length) return notify("Tambah minimal satu item.", "error");
    if (BACKEND_ENABLED) {
      try {
        const result = await backendRequest<{ id?: string }>("/api/b2b/sales-orders", { method: "POST", body: JSON.stringify({ customer_id: customerId, payment_terms_days: terms, notes, items }) });
        const soId = result?.id || `so-${Date.now()}`;
        const customer = parties.find((p) => p.id === customerId);
        const newOrder: SalesOrder = { id: soId, customer_id: customerId, customer_name: customer?.name || "", customer_phone: customer?.phone || "", order_date: new Date().toISOString().slice(0, 10), status: "DRAFT", payment_terms_days: terms, total_amount: items.reduce((s, it) => s + it.qty * it.unit_price, 0), notes, items: items.map((it, i) => ({ id: `soi-${Date.now()}-${i}`, ...it, subtotal: it.qty * it.unit_price, item_name: products.find((p) => p.id === it.item_id)?.name || "" })) };
        setB2bOrders((prev) => [newOrder, ...prev]);
      } catch (error) { return notify(error instanceof Error ? error.message : "Gagal membuat sales order.", "error"); }
    }
    setModal(null);
    notify("Sales order berhasil dibuat.");
  };

  const confirmB2BOrder = async (id: string) => {
    if (BACKEND_ENABLED) {
      try { await backendRequest(`/api/b2b/sales-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: "CONFIRMED" }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Gagal konfirmasi SO.", "error"); }
    }
    setB2bOrders((prev) => prev.map((so) => so.id === id ? { ...so, status: "CONFIRMED" } : so));
    notify("Sales order dikonfirmasi.");
  };

  const createB2BDelivery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const soId = String(form.get("salesOrderId") || "");
    const driverName = String(form.get("driverName") || "");
    const notes = String(form.get("notes") || "");
    if (!soId) return notify("Pilih sales order.", "error");
    if (BACKEND_ENABLED) {
      try {
        const result = await backendRequest<{ id?: string }>("/api/b2b/delivery-orders", { method: "POST", body: JSON.stringify({ sales_order_id: soId, driver_name: driverName, notes }) });
        const so = b2bOrders.find((o) => o.id === soId);
        const newDO: DeliveryOrder = { id: result?.id || `do-${Date.now()}`, sales_order_id: soId, customer_name: so?.customer_name, so_date: so?.order_date, delivery_date: new Date().toISOString().slice(0, 10), status: "PENDING", notes, driver_name: driverName, items: so?.items.map((it) => ({ id: `doi-${Date.now()}`, item_id: it.item_id, qty: it.qty, item_name: it.item_name, unit_code: it.unit_code })) || [] };
        setB2bDeliveries((prev) => [newDO, ...prev]);
      } catch (error) { return notify(error instanceof Error ? error.message : "Gagal membuat surat jalan.", "error"); }
    }
    setModal(null);
    notify("Surat jalan berhasil dibuat.");
  };

  const deliverB2BOrder = async (doId: string, soId: string) => {
    if (BACKEND_ENABLED) {
      try { await backendRequest(`/api/b2b/sales-orders/${soId}`, { method: "PATCH", body: JSON.stringify({ status: "DELIVERED" }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Gagal update status.", "error"); }
    }
    setB2bDeliveries((prev) => prev.map((d) => d.id === doId ? { ...d, status: "DELIVERED" } : d));
    setB2bOrders((prev) => prev.map((so) => so.id === soId ? { ...so, status: "DELIVERED" } : so));
    notify("Pengiriman dikonfirmasi.");
  };

  const createB2BInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const soId = String(form.get("salesOrderId") || "");
    if (!soId) return notify("Pilih sales order.", "error");
    if (BACKEND_ENABLED) {
      try {
        const result = await backendRequest<{ id?: string; invoice_number?: string; due_date?: string; total_amount?: number }>("/api/b2b/invoices", { method: "POST", body: JSON.stringify({ sales_order_id: soId }) });
        const so = b2bOrders.find((o) => o.id === soId);
        const newInv: Invoice = { id: result?.id || `inv-${Date.now()}`, sales_order_id: soId, invoice_number: result?.invoice_number || "", invoice_date: new Date().toISOString().slice(0, 10), due_date: result?.due_date || "", total_amount: result?.total_amount || so?.total_amount || 0, paid_amount: 0, status: "UNPAID", notes: "", customer_name: so?.customer_name };
        setB2bInvoices((prev) => [newInv, ...prev]);
        setB2bOrders((prev) => prev.map((o) => o.id === soId ? { ...o, status: "INVOICED" } : o));
      } catch (error) { return notify(error instanceof Error ? error.message : "Gagal membuat invoice.", "error"); }
    }
    setModal(null);
    notify("Invoice berhasil dibuat.");
  };

  const openInvoicePayment = (invoiceId: string) => {
    const invoice = b2bInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const remaining = invoice.total_amount - invoice.paid_amount;
    if (remaining <= 0) return;
    setPartialPayment({ kind: "invoice", id: invoiceId, title: `Invoice ${invoice.invoice_number}`, remaining });
  };

  const exportReport = async () => {
    try {
      if (BACKEND_ENABLED) {
        // Use backend export (correct COGS calculation)
        const from = new Date().toISOString().slice(0, 7) + "-01";
        const to = new Date().toISOString().slice(0, 10);
        const response = await fetch(`/api/reports/export?dateFrom=${from}&dateTo=${to}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `laporan-dapurkasir-${from}-${to}.csv`;
          link.click();
          URL.revokeObjectURL(url);
          notify("Laporan CSV siap diunduh.");
          return;
        }
      }
      // Fallback: client-side export
      const revenue = sales.reduce((sum, item) => sum + item.total, 0);
      const cogs = sales.reduce((sum, item) => sum + item.cogs, 0);
      const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
      const csv = ["Tanggal,Omzet,COGS,Laba Kotor,Pengeluaran,Net Profit", `${new Date().toISOString().slice(0, 10)},${revenue},${cogs},${revenue - cogs},${expenseTotal},${revenue - cogs - expenseTotal}`].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-dapurkasir-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify("Laporan CSV siap diunduh.");
    } catch {
      notify("Export laporan gagal.", "error");
    }
  };

  const resetAllData = async () => {
    const answer = window.prompt("Semua produk, bahan, transaksi, piutang, dan pengeluaran akan dihapus permanen. Ketik HAPUS untuk melanjutkan.");
    if (!answer || answer.trim().toUpperCase() !== "HAPUS") return notify("Penghapusan dibatalkan.", "default");
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/dev/reset", { method: "POST" }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Gagal menghapus data.", "error"); }
    }
    setProducts([]); setMaterials([]); setReceivables([]); setExpenses([]); setPurchases([]); setPayables([]); setBatches([]); setCapitalEntries([]); setSales([]); setSalesCount(0); setCart([]); setLastSale(null); setDashboardData(null);
    window.localStorage.removeItem("dapurkasir-demo");
    notify("Semua data berhasil dihapus. Aplikasi kembali kosong.");
  };

  const fillDummyData = async () => {
    if (!window.confirm("Isi aplikasi dengan data dummy? Data yang ada sekarang akan diganti.")) return;
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/dev/seed", { method: "POST" }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Gagal membuat data dummy.", "error"); }
      notify("Data dummy berhasil dibuat. Memuat ulang halaman...");
      window.setTimeout(() => window.location.reload(), 900);
      return;
    }
    setProducts(demoProducts); setMaterials(demoMaterials); setReceivables(demoReceivables); setExpenses(demoExpenses); setPurchases(demoPurchases); setPayables(demoPurchases); setBatches(demoBatches); setCapitalEntries(demoCapital); setSales(demoSales); setSalesCount(38); setCart([]);
    notify("Data dummy berhasil dimuat.");
  };

  const importItems = async (file: File, kind: ImportKind) => {
    if (!BACKEND_ENABLED) return notify("Import XLSX tersedia setelah backend diaktifkan.", "error");
    const formData = new FormData();
    formData.append("type", kind);
    formData.append("file", file);
    try {
      const result = await backendRequest<{ imported: number }>('/api/items/import', { method: "POST", body: formData });
      notify(`${result.imported} ${kind === "PRODUCT" ? "produk" : "bahan baku"} berhasil diimport. Memuat ulang data...`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Import XLSX gagal.", "error");
    }
  };

  return (
    <div className={`app-shell ${dark ? "dark-mode" : ""}`}>
      <Sidebar view={view} navigate={navigate} onPlan={() => window.location.href = "/pricing"} salesCount={salesCount} plan={plan} account={account} />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-context"><strong>{businessName}</strong><span> / </span>{view === "pos" ? "Kasir POS" : navSections.flatMap((section) => section.items).find((item) => item.id === view)?.label || "Pengaturan"}</div>
          <div className="topbar-actions">
            <button className="icon-button mobile-only" aria-label="Buka menu"><PanelLeft size={18} /></button>
            <button className="icon-button" aria-label="Notifikasi" onClick={() => notify("Tidak ada notifikasi baru.", "default")}><Bell size={17} /></button>
            <button className="icon-button" aria-label="Ganti tema" onClick={() => setDark((value) => !value)}>{dark ? <Sparkles size={17} /> : <Leaf size={17} />}</button>
          </div>
        </header>
        {view === "dashboard" && <Dashboard products={products} materials={materials} expenses={expenses} receivables={receivables} sales={sales} salesCount={salesCount} dueReceivables={dueReceivables} dashboardData={dashboardData} plan={plan} businessName={businessName} navigate={navigate} />}
        {view === "pos" && <POS products={products} cart={cart} total={cartTotal} discount={discount} onDiscountChange={setDiscount} onAdd={addToCart} onChangeQty={changeCartQty} onPay={() => setModal("payment")} onNewProduct={() => openCreate("product")} />}
        {view === "products" && <ItemList title="Produk Jadi" description="Kelola produk siap jual dan pantau stoknya." items={products} kind="product" onAdd={() => openCreate("product")} onNavigate={navigate} onImport={(file) => importItems(file, "PRODUCT")} onDownloadTemplate={() => downloadItemTemplate("PRODUCT")} />}
        {view === "materials" && <MaterialList materials={materials} onAdd={() => openCreate("material")} onImport={(file) => importItems(file, "RAW_MATERIAL")} onDownloadTemplate={() => downloadItemTemplate("RAW_MATERIAL")} />}
        {view === "production" && <ProductionView batches={batches} products={products} materials={materials} onAdd={() => openCreate("production")} />}
         {view === "purchases" && <PurchaseView2 purchases={purchases} materials={materials} onAdd={() => openCreate("purchase")} onPay={openPayablePayment} onReturn={() => openCreate("return")} />}
        {view === "parties" && <PartyView parties={parties} onAdd={() => openCreate("party")} onWhatsApp={sendWhatsApp} />}
        {view === "receivables" && <ReceivableView receivables={receivables} onPay={openReceivablePayment} />}
        {view === "expenses" && <ExpenseView expenses={expenses} onAdd={() => openCreate("expense")} />}
        {view === "cash-recon" && <CashReconView recons={cashRecons} onAdd={() => openCreate("cash-recon")} />}
         {view === "reports" && <ReportView2 expenses={expenses} capitalEntries={capitalEntries} purchases={purchases} receivables={receivables} products={products} sales={sales} exportReport={exportReport} onAddCapital={() => openCreate("capital")} />}
         {view === "b2b-orders" && <B2BOrderView orders={b2bOrders} onAdd={() => openCreate("b2b-order")} onConfirm={confirmB2BOrder} />}
         {view === "b2b-deliveries" && <B2BDeliveryView deliveries={b2bDeliveries} orders={b2bOrders} onAdd={() => openCreate("b2b-delivery")} onDeliver={deliverB2BOrder} />}
         {view === "b2b-invoices" && <B2BInvoiceView invoices={b2bInvoices} orders={b2bOrders} onAdd={() => openCreate("b2b-invoice")} onPay={openInvoicePayment} />}
         {view === "b2b-aging" && <B2BAgingView aging={b2bAging} />}
         {view === "guide" && <GuideView role={account.role} />}
        {view === "settings" && <SettingsView dark={dark} setDark={setDark} notify={notify} onReset={resetAllData} onSeed={fillDummyData} businessProfile={businessProfile} onSaveProfile={saveBusinessProfile} />}
        <BottomNav view={view} navigate={navigate} role={account.role} onMenu={() => setMobileSheetOpen(true)} />
      </div>
      {modal === "product" && <ItemModal kind="product" onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal === "material" && <ItemModal kind="material" onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal === "expense" && <ExpenseModal2 onClose={() => setModal(null)} onSave={saveExpense} />}
      {modal === "production" && <ProductionModal2 products={products} materials={materials} onClose={() => setModal(null)} onSave={saveProduction} />}
      {modal === "purchase" && <PurchaseModal2 materials={materials} suppliers={parties.filter((item) => item.type === "SUPPLIER").map((item) => item.name)} onCreateSupplier={(name) => createParty(name, "SUPPLIER")} onClose={() => setModal(null)} onSave={savePurchase} />}
      {modal === "capital" && <CapitalModal onClose={() => setModal(null)} onSave={saveCapital} />}
      {modal === "party" && <PartyModal onClose={() => setModal(null)} onSave={saveParty} />}
      {modal === "payment" && <PaymentModal total={cartTotal} customers={parties.filter((item) => item.type === "CUSTOMER").map((item) => item.name)} onCreateCustomer={(name) => createParty(name, "CUSTOMER")} onClose={() => setModal(null)} onPay={handlePayment} />}
      {modal === "receipt" && lastSale && <ReceiptModal sale={lastSale} onClose={() => setModal(null)} onPrint={() => notify("Struk dikirim ke printer. Jika gagal, bagikan struk digital.", "default")} />}
      {modal === "b2b-order" && <B2BOrderModal customers={parties.filter((p) => p.type === "CUSTOMER")} products={products} onClose={() => setModal(null)} onSave={saveB2BOrder} />}
      {modal === "b2b-delivery" && <B2BDeliveryModal orders={b2bOrders.filter((so) => so.status === "CONFIRMED")} onClose={() => setModal(null)} onSave={createB2BDelivery} />}
      {modal === "b2b-invoice" && <B2BInvoiceModal orders={b2bOrders.filter((so) => so.status === "DELIVERED")} onClose={() => setModal(null)} onSave={createB2BInvoice} />}
      {modal === "return" && <SupplierReturnModal purchases={purchases} materials={materials} suppliers={parties.filter((p) => p.type === "SUPPLIER")} onClose={() => setModal(null)} onSave={saveSupplierReturn} />}
      {modal === "cash-recon" && <CashReconModal onClose={() => setModal(null)} onSave={saveCashReconciliation} />}
      {partialPayment && <PartialPaymentModal target={partialPayment} onClose={() => setPartialPayment(null)} onSave={savePartialPayment} />}
      {toast && <div className={`toast ${toast.tone}`} role="status"><Check size={16} />{toast.message}</div>}
      {mobileSheetOpen && <MobileNavSheet view={view} navigate={(v) => { navigate(v); setMobileSheetOpen(false); }} onClose={() => setMobileSheetOpen(false)} role={account.role} />}
    </div>
  );
}

function Sidebar({ view, navigate, onPlan, salesCount, plan, account }: { view: View; navigate: (view: View) => void; onPlan: () => void; salesCount: number; plan: PlanState; account: { name: string; role: "OWNER" | "KASIR" } }) {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    // Never leave the previous account's data sitting in this browser — this device
    // may be a shared cashier tablet where the next login is a different business.
    window.localStorage.removeItem("dapurkasir-demo");
    window.location.href = "/login";
  };
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">DK</div><div><span className="brand-name">DapurKasir</span><span className="brand-sub">operasional kuliner</span></div></div>
    <nav aria-label="Navigasi utama">
      {navSections.map((section) => {
        const items = account.role === "KASIR"
          ? section.items.filter((item) => CASHIER_VIEWS.includes(item.id as View))
          : section.items;
        if (!items.length) return null;
        return <div className="nav-group" key={section.label}>
          <div className="nav-label">{section.label}</div>
          {items.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => navigate(item.id as View)}><Icon size={17} />{item.label}</button>; })}
        </div>;
      })}
    </nav>
    <div className="sidebar-bottom">
      <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings size={17} />Pengaturan</button>
      {account.role === "OWNER" && <div className="plan-card">{plan.name === "PRO" ? <><span className="badge badge-green">PRO plan</span><strong>Transaksi tanpa batas</strong><p>Semua fitur PRO aktif untuk bisnis ini.</p></> : <><span className="badge badge-emerald">Free plan</span><strong>{salesCount} dari {plan.salesLimit} transaksi</strong><p>{salesCount >= plan.salesLimit * 0.8 ? "Hampir mencapai batas." : "Ruang cukup untuk operasional bulan ini."}</p><button className="button button-primary" onClick={onPlan}>Upgrade PRO <ChevronRight size={14} /></button></>}</div>}
      <div className="profile-chip"><div className="avatar">{initials(account.name)}</div><div><strong>{account.name}</strong><span>{account.role === "KASIR" ? "Kasir" : "Owner"}</span></div><button className="icon-button" style={{ marginLeft: "auto", width: 30, height: 30, border: 0 }} aria-label="Keluar" onClick={handleLogout}><LogOut size={14} /></button></div>
    </div>
  </aside>;
}

function MobileNavSheet({ view, navigate, onClose, role }: { view: View; navigate: (view: View) => void; onClose: () => void; role: "OWNER" | "KASIR" }) {
  return <div className="mobile-sheet-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mobile-sheet" role="dialog" aria-label="Navigasi">
      <div className="mobile-sheet-header">
        <div className="brand"><div className="brand-mark">DK</div><div><span className="brand-name">DapurKasir</span><span className="brand-sub">Navigasi</span></div></div>
        <button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={17} /></button>
      </div>
      <div className="mobile-sheet-body">
        {navSections.map((section) => {
          const items = role === "KASIR" ? section.items.filter((item) => CASHIER_VIEWS.includes(item.id as View)) : section.items;
          if (!items.length) return null;
          return <div className="mobile-sheet-group" key={section.label}>
            <div className="mobile-sheet-label">{section.label}</div>
            {items.map((item) => { const Icon = item.icon; return <button key={item.id} className={`mobile-sheet-item ${view === item.id ? "active" : ""}`} onClick={() => navigate(item.id as View)}><Icon size={18} />{item.label}</button>; })}
          </div>;
        })}
        <div className="mobile-sheet-group">
          <div className="mobile-sheet-label">Lainnya</div>
          <button className={`mobile-sheet-item ${view === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings size={18} />Pengaturan</button>
        </div>
      </div>
    </div>
  </div>;
}

function BottomNav({ view, navigate, role, onMenu }: { view: View; navigate: (view: View) => void; role: "OWNER" | "KASIR"; onMenu: () => void }) {
  const all: { id: View; label: string; icon: typeof LayoutDashboard }[] = [{ id: "pos", label: "Kasir", icon: ShoppingCart }, { id: "production", label: "Produksi", icon: Boxes }, { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard }, { id: "settings", label: "Menu", icon: MoreHorizontal }];
  const items = role === "KASIR" ? all.filter((item) => CASHIER_VIEWS.includes(item.id)) : all;
  return <nav className="bottom-nav" aria-label="Navigasi mobile">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => item.id === "settings" ? onMenu() : navigate(item.id)}><Icon size={19} />{item.label}</button>; })}</nav>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-actions">{action}</div>}</div>;
}

function Dashboard({ products, materials, expenses, receivables, sales, salesCount, dueReceivables, dashboardData, plan, businessName, navigate }: { products: Product[]; materials: Material[]; expenses: Expense[]; receivables: Receivable[]; sales: SaleSummary[]; salesCount: number; dueReceivables: number; dashboardData: DashboardData | null; plan: PlanState; businessName: string; navigate: (view: View) => void }) {
  const critical = dashboardData?.criticalMaterials.length
    ? dashboardData.criticalMaterials
    : materials.filter((item) => item.stock <= (item.unit === "pcs" ? 60 : 2));
  const revenue = dashboardData?.today.revenue ?? 0;
  const cogs = dashboardData?.today.cogs ?? 0;
  const expenseTotal = dashboardData?.today.expenses ?? expenses.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = revenue - cogs;
  const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
  // Prefer the server series; in demo mode fold the local sales list into the same
  // seven buckets. Never fall back to invented numbers — an empty shop must look empty.
  const trend = dashboardData?.salesTrend?.length
    ? dashboardData.salesTrend
    : Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().slice(0, 10);
        return { date: key, total: sales.filter((item) => item.date === key).reduce((sum, item) => sum + item.total, 0) };
      });
  const peak = Math.max(...trend.map((item) => item.total), 0);
  const days = trend.map((item) => ({
    day: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(new Date(`${item.date}T00:00:00`)),
    total: item.total,
    height: peak > 0 ? Math.max(2, Math.round((item.total / peak) * 100)) : 0,
  }));
  const todayLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return <main className="page">
    <PageHeading eyebrow={todayLabel} title="Selamat datang." description="Ini yang perlu kamu tahu dari operasional hari ini." action={<><button className="button button-secondary" onClick={() => navigate("reports")}><FileText size={16} />Lihat laporan</button><button className="button button-primary" onClick={() => navigate("pos")}><Plus size={17} />Transaksi baru</button></>} />
    <div className="kpi-grid">
      <Kpi label="Omzet hari ini" value={revenue > 0 ? rupiah(revenue) : "Rp 0"} foot={<span>{dashboardData ? "Penjualan hari ini" : "Memuat data..."}</span>} icon={<TrendingUp size={16} />} />
      <Kpi label="Laba kotor" value={grossProfit > 0 ? rupiah(grossProfit) : "Rp 0"} foot={<><span className={margin > 0 ? "positive" : ""}>Margin {margin}%</span><span> · hari ini</span></>} icon={<CircleDollarSign size={16} />} />
      <Kpi label="Stok kritis" value={`${critical.length} bahan`} foot={<><span className="negative">Perlu ditindak</span><span> · sekarang</span></>} icon={<Leaf size={16} />} tone="warning" />
      <Kpi label="Piutang berjalan" value={rupiah(dueReceivables)} foot={<><Clock3 size={13} className="negative" /><span>{dashboardData?.dueReceivables.length || 0} jatuh tempo</span></>} icon={<WalletCards size={16} />} tone="warning" />
    </div>
    <div className="dashboard-grid">
      <div className="dashboard-stack">
        <section className="card card-pad"><div className="section-header"><div><h2>Ritme penjualan</h2><p>Omzet 7 hari terakhir</p></div><button className="section-link" onClick={() => navigate("reports")}>Detail laporan <ChevronRight size={14} style={{ verticalAlign: "-2px" }} /></button></div><div className="chart-wrap">{days.map((item, index) => <div className={`chart-column ${index === days.length - 1 ? "today" : ""}`} key={index}><span className="chart-value">{item.total > 0 ? shortRupiah(item.total) : "-"}</span><div className="chart-bar" style={{ height: `${item.height}%` }} /><span className="chart-label">{item.day}</span></div>)}</div><div className="progress-line"><span>{salesCount} transaksi bulan ini</span><span>{plan.name === "PRO" ? "Paket PRO — tanpa batas" : `Kuota Free ${salesCount}/${plan.salesLimit}`}</span></div>{plan.name !== "PRO" && <div className="progress" style={{ marginTop: 7 }}><span style={{ width: `${Math.min(100, (salesCount / plan.salesLimit) * 100)}%` }} /></div>}</section>
        <section className="card card-pad"><div className="section-header"><div><h2>Aktivitas terbaru</h2><p>Catatan operasional terakhir</p></div><button className="section-link" onClick={() => navigate("reports")}>Buka riwayat <ChevronRight size={14} style={{ verticalAlign: "-2px" }} /></button></div><div className="activity-list">{dashboardData?.recentActivity.sales.slice(0, 2).map((sale) => <Activity key={sale.id} icon={<ShoppingCart size={15} />} title={`Penjualan ${sale.method}`} detail={rupiah(sale.total)} value={rupiah(sale.total)} time={new Date(sale.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} />)}{dashboardData?.recentActivity.batches.slice(0, 1).map((batch) => <Activity key={batch.id} icon={<Boxes size={15} />} title="Batch produksi selesai" detail={`${batch.product} · ${batch.qty} unit`} value={`HPP ${rupiah(batch.cogs)}`} time={new Date(batch.date).toLocaleDateString("id-ID")} />)}{dashboardData?.recentActivity.purchases.slice(0, 1).map((purchase) => <Activity key={purchase.id} icon={<Truck size={15} />} title="Pembelian bahan" detail={purchase.supplier} value={rupiah(purchase.total)} time={new Date(purchase.date).toLocaleDateString("id-ID")} />)}{!dashboardData && <p className="table-muted">Memuat aktivitas...</p>}</div></section>
      </div>
      <div className="dashboard-stack">
        <section className="card card-pad"><div className="section-header"><div><h2>Perlu perhatian</h2><p>Jangan sampai menghambat besok</p></div><Bell size={17} color="#b45309" /></div><div className="alert-list">{critical.slice(0, 4).map((item) => <div className="alert-row" key={item.id}><span className={`status-dot ${item.stock <= 1 ? "red" : ""}`} /><div className="row-main"><strong>{item.name}</strong><span>Stok tersisa {item.stock} {item.unit}</span></div><button className="section-link" onClick={() => navigate("purchases")}>Restock</button></div>)}{critical.length === 0 && <p className="table-muted">Semua stok bahan aman.</p>}</div></section>
        <section className="card card-pad"><div className="section-header"><div><h2>Piutang terdekat</h2><p>Tagihan yang perlu dipantau</p></div><button className="section-link" onClick={() => navigate("receivables")}>Lihat semua</button></div><div className="alert-list">{dashboardData?.dueReceivables.length ? dashboardData.dueReceivables.slice(0, 3).map((item, i) => <div className="alert-row" key={i}><span className="status-dot red" /><div className="row-main"><strong>{item.customer}</strong><span>Jatuh tempo {dateLabel(item.dueDate)}</span></div><span className="row-side">{rupiah(item.remaining)}</span></div>) : receivables.filter((item) => item.amount > item.paid).slice(0, 3).map((item) => <div className="alert-row" key={item.id}><span className="status-dot red" /><div className="row-main"><strong>{item.customer}</strong><span>Jatuh tempo {dateLabel(item.due)}</span></div><span className="row-side">{rupiah(item.amount - item.paid)}</span></div>)}</div></section>
        {revenue > 0 ? <section className="callout success"><Sparkles size={17} /><div><strong>Ringkasan hari ini</strong><p>Laba kotor {rupiah(grossProfit)} dari penjualan hari ini.</p></div></section> : <section className="callout"><Sparkles size={17} /><div><strong>Belum ada aktivitas hari ini</strong><p>Ringkasan margin akan muncul setelah ada penjualan.</p></div></section>}
      </div>
    </div>
    <div className="split-grid" style={{ marginTop: 18 }}><section className="card card-pad"><div className="section-header"><div><h2>Produk terlaris</h2><p>Kontribusi penjualan bulan ini</p></div><button className="section-link" onClick={() => navigate("products")}>Kelola produk</button></div><div className="activity-list">{products.length && sales.length ? products.slice(0, 3).map((product, index) => <div className="activity-row" key={product.id}><div className="item-avatar">0{index + 1}</div><div className="row-main"><strong>{product.name}</strong><span>Data detail penjualan tersedia di laporan.</span></div></div>) : <p className="table-muted">Belum ada penjualan. Produk terlaris akan muncul setelah transaksi tercatat.</p>}</div></section><section className="card card-pad"><div className="section-header"><div><h2>Ringkas paket</h2><p>Pemakaian bulan berjalan</p></div><span className={`badge ${plan.name === "PRO" ? "badge-green" : "badge-emerald"}`}>{plan.name}</span></div><div className="progress-line"><span>Transaksi POS</span><strong>{dashboardData?.plan.salesCount ?? salesCount} / {plan.name === "PRO" ? "∞" : plan.salesLimit}</strong></div>{plan.name !== "PRO" && <div className="progress"><span style={{ width: `${Math.min(100, ((dashboardData?.plan.salesCount ?? salesCount) / plan.salesLimit) * 100)}%` }} /></div>}<div className="progress-line"><span>Produk jadi</span><strong>{dashboardData?.plan.productCount ?? products.length} / {plan.name === "PRO" ? "∞" : plan.productLimit}</strong></div>{plan.name !== "PRO" && <div className="progress"><span style={{ width: `${Math.min(100, ((dashboardData?.plan.productCount ?? products.length) / plan.productLimit) * 100)}%` }} /></div>}<div className="progress-line"><span>Bahan baku</span><strong>{dashboardData?.plan.materialCount ?? materials.length} / {plan.name === "PRO" ? "∞" : plan.materialLimit}</strong></div>{plan.name !== "PRO" && <div className="progress"><span style={{ width: `${Math.min(100, ((dashboardData?.plan.materialCount ?? materials.length) / plan.materialLimit) * 100)}%` }} /></div>}</section></div>
  </main>;
}

function Kpi({ label, value, foot, icon, tone }: { label: string; value: string; foot: ReactNode; icon: ReactNode; tone?: "warning" }) { return <div className="kpi-card"><div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone === "warning" ? "" : ""}`}>{icon}</span></div><p className="kpi-value">{value}</p><div className="kpi-foot">{foot}</div></div>; }
function Activity({ icon, title, detail, value, time }: { icon: ReactNode; title: string; detail: string; value: string; time: string }) { return <div className="activity-row"><div className="item-avatar">{icon}</div><div className="row-main"><strong>{title}</strong><span>{detail} · {time}</span></div><span className="row-side">{value}</span></div>; }

function POS({ products, cart, total, discount, onDiscountChange, onAdd, onChangeQty, onPay, onNewProduct }: { products: Product[]; cart: CartItem[]; total: number; discount: number; onDiscountChange: (value: number) => void; onAdd: (product: Product) => void; onChangeQty: (id: string, delta: number) => void; onPay: () => void; onNewProduct: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const categories = ["Semua", ...Array.from(new Set(products.map((item) => item.category)))];
  const filtered = products.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) && (category === "Semua" || item.category === category));
  return <main className="pos-page"><div className="pos-layout"><section><div className="pos-heading"><div><p className="eyebrow">Shift pagi · kasir aktif</p><h1>Mulai transaksi</h1><p>Pilih produk atau cari nama menu di bawah.</p></div><div className="pos-controls"><button className="button button-secondary" onClick={onNewProduct}><Plus size={16} /><span>Produk baru</span></button><button className="icon-button" aria-label="Pengaturan POS"><SlidersHorizontal size={17} /></button></div></div><div className="search-field pos-search"><Search size={17} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." aria-label="Cari produk" /></div><div className="category-row">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="product-grid">{filtered.map((product) => <button className="product-card" key={product.id} onClick={() => onAdd(product)} disabled={!product.active}><div className="product-card-top"><span className="product-emoji">{product.emoji}</span><span className={`badge ${product.stock <= 5 ? "badge-amber" : "badge-green"}`}>{product.stock} {product.unit}</span></div><div><p className="product-name">{product.name}</p><span className="product-price">{rupiah(product.price)}</span></div></button>)}{!filtered.length && <div className="empty-state"><Search size={24} /><strong>Produk tidak ditemukan</strong><p>Coba kata kunci atau kategori lain.</p></div>}</div></section><aside className="card cart-panel"><div className="cart-header"><div><h2>Keranjang</h2><span style={{ color: "var(--muted)", fontSize: 11 }}>Transaksi baru</span></div><span className="cart-count">{cart.reduce((sum, item) => sum + item.qty, 0)} item</span></div><div className="cart-items">{cart.length ? cart.map((item) => <div className="cart-item" key={item.id}><div><strong>{item.name}</strong><small>{rupiah(item.price)} / {item.unit}</small><div className="qty-control"><button className="qty-button" onClick={() => onChangeQty(item.id, -1)} aria-label={`Kurangi ${item.name}`}><Minus size={14} /></button><span className="qty-number">{item.qty}</span><button className="qty-button" onClick={() => onChangeQty(item.id, 1)} aria-label={`Tambah ${item.name}`}><Plus size={14} /></button></div></div><span className="cart-subtotal">{rupiah(item.price * item.qty)}</span></div>) : <div className="empty-state"><ShoppingCart size={25} /><strong>Keranjang masih kosong</strong><p>Tap produk di sebelah kiri untuk mulai menambahkan pesanan.</p></div>}</div><div className="cart-footer"><div className="total-row"><span>Subtotal</span><strong>{rupiah(total)}</strong></div>{discount > 0 && <div className="total-row"><span>Diskon</span><strong className="negative">-{rupiah(discount)}</strong></div>}<div className="total-row"><span>Total tagihan</span><strong>{rupiah(Math.max(0, total - discount))}</strong></div><div className="field" style={{ marginBottom: 12 }}><label htmlFor="pos-discount">Diskon (Rp)</label><input className="input" id="pos-discount" type="number" min="0" max={total} value={discount || ""} placeholder="0" onChange={(event) => onDiscountChange(Math.max(0, Number(event.target.value) || 0))} /></div><button className="button button-primary" style={{ width: "100%", minHeight: 48 }} disabled={!cart.length} onClick={onPay}>Bayar sekarang <ChevronRight size={17} /></button></div></aside></div></main>;
}

function ItemList({ title, description, items, kind, onAdd, onNavigate, onImport, onDownloadTemplate }: { title: string; description: string; items: Product[]; kind: "product"; onAdd: () => void; onNavigate: (view: View) => void; onImport: (file: File) => void; onDownloadTemplate: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><PageHeading eyebrow="Master data" title={title} description={description} action={<><button className="button button-secondary" onClick={onDownloadTemplate}><FileDown size={16} />Template XLSX</button><label className="button button-secondary" style={{ cursor: "pointer" }}><FileDown size={16} />Import XLSX<input type="file" accept=".xlsx,.xls" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.currentTarget.value = ""; }} /></label><button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah produk</button></>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." aria-label="Cari produk" /></div><button className="button button-secondary"><SlidersHorizontal size={15} />Filter</button></div><section className="card table-wrap"><table><thead><tr><th>Produk</th><th>Kategori</th><th>Harga jual</th><th>HPP / unit</th><th className="text-right">Stok</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="item-cell"><span className="item-avatar">{item.emoji}</span><div><strong>{item.name}</strong><span>Satuan {item.unit}</span></div></div></td><td>{item.category}</td><td className="table-primary">{rupiah(item.price)}</td><td>{item.cogs ? rupiah(item.cogs) : <span className="table-muted">Belum ada</span>}</td><td className="text-right table-primary">{item.stock} {item.unit}</td><td><span className="badge badge-green">Aktif</span></td><td className="text-right"><button className="button button-ghost" onClick={() => onNavigate("settings")}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></section></main>;
}

function MaterialList({ materials, onAdd, onImport, onDownloadTemplate }: { materials: Material[]; onAdd: () => void; onImport: (file: File) => void; onDownloadTemplate: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = materials.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><PageHeading eyebrow="Master data" title="Bahan baku" description="Pastikan bahan utama selalu tersedia sebelum produksi dimulai." action={<><button className="button button-secondary" onClick={onDownloadTemplate}><FileDown size={16} />Template XLSX</button><label className="button button-secondary" style={{ cursor: "pointer" }}><FileDown size={16} />Import XLSX<input type="file" accept=".xlsx,.xls" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.currentTarget.value = ""; }} /></label><button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah bahan</button></>} /><div className="callout warning" style={{ marginBottom: 18 }}><Leaf size={17} /><div><strong>{materials.filter((item) => item.stock <= 2).length} bahan perlu diperiksa</strong><p>Restock bahan yang berada di bawah batas aman produksi.</p></div></div><div className="toolbar"><div className="search-field"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari bahan baku..." aria-label="Cari bahan baku" /></div></div><section className="card table-wrap"><table><thead><tr><th>Bahan baku</th><th>Supplier terakhir</th><th>Harga beli terakhir</th><th className="text-right">Stok tersedia</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="item-cell"><span className="item-avatar"><Leaf size={15} /></span><div><strong>{item.name}</strong><span>Satuan {item.unit}</span></div></div></td><td>{item.supplier}</td><td className="table-primary">{rupiah(item.lastBuy)} / {item.unit}</td><td className={`text-right table-primary ${item.stock <= 2 ? "negative" : ""}`}>{item.stock} {item.unit}</td><td><span className={`badge ${item.stock <= 2 ? "badge-amber" : "badge-green"}`}>{item.stock <= 2 ? "Kritis" : "Aman"}</span></td><td className="text-right"><button className="button button-ghost"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></section></main>;
}

function ProductionView({ batches, products, materials, onAdd }: { batches: Batch[]; products: Product[]; materials: Material[]; onAdd: () => void }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyBatches = batches.filter((batch) => batch.date.slice(0, 7) === currentMonth);

  return <main className="page"><PageHeading eyebrow="Produksi" title="Produksi batch" description="Ubah bahan baku menjadi stok produk dengan HPP yang terukur." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Buat batch produksi</button>} /><div className="page-card-grid"><div className="mini-stat"><span className="mini-stat-label">Batch bulan ini</span><p className="mini-stat-value">{monthlyBatches.length}</p></div><div className="mini-stat"><span className="mini-stat-label">Produk aktif</span><p className="mini-stat-value">{products.length}</p></div><div className="mini-stat"><span className="mini-stat-label">Bahan terpantau</span><p className="mini-stat-value">{materials.length}</p></div></div><section className="card table-wrap" style={{ marginTop: 18 }}><div className="card-pad section-header"><div><h2>Riwayat batch</h2><p>HPP tersimpan dari setiap proses produksi</p></div><span className="badge badge-blue">Terbaru</span></div><table><thead><tr><th>Kode batch</th><th>Produk output</th><th>Qty hasil</th><th>HPP / unit</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td className="table-primary" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{batch.code}</td><td>{batch.product}</td><td>{batch.qty} unit</td><td className="table-primary">{rupiah(batch.cogs)}</td><td className="table-muted">{dateLabel(batch.date)}</td><td><span className="badge badge-green">Selesai</span></td></tr>)}</tbody></table></section></main>;
}

function PurchaseView({ purchases, materials, onAdd }: { purchases: Purchase[]; materials: Material[]; onAdd: () => void }) { const debt = purchases.reduce((sum, item) => sum + item.remaining, 0); return <main className="page"><PageHeading eyebrow="Operasional" title="Pembelian bahan" description="Catat pembelian, perbarui stok, dan pantau utang supplier." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Catat pembelian</button>} /><div className="page-card-grid"><div className="mini-stat"><span className="mini-stat-label">Pembelian bulan ini</span><p className="mini-stat-value">{purchases.length}</p></div><div className="mini-stat"><span className="mini-stat-label">Total belanja</span><p className="mini-stat-value">{shortRupiah(purchases.reduce((sum, item) => sum + item.total, 0))}</p></div><div className="mini-stat"><span className="mini-stat-label">Utang supplier</span><p className="mini-stat-value negative">{shortRupiah(debt)}</p></div></div><section className="card table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Detail</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td className="table-muted">{dateLabel(purchase.date)}</td><td className="table-primary">{purchase.supplier}</td><td>{materials.length} bahan tercatat</td><td className="table-primary">{rupiah(purchase.total)}</td><td><span className={`badge ${purchase.status === "LUNAS" ? "badge-green" : "badge-amber"}`}>{purchase.status === "LUNAS" ? "Lunas" : purchase.status === "SEBAGIAN" ? "Sebagian" : "Belum lunas"}</span></td><td><button className="button button-ghost"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></section></main>; }

function PartyView({ parties, onAdd, onWhatsApp }: { parties: Party[]; onAdd: () => void; onWhatsApp: (phone: string, message: string) => void }) {
  const customers = parties.filter((item) => item.type === "CUSTOMER");
  const suppliers = parties.filter((item) => item.type === "SUPPLIER");
  const customerTable = () => customers.length
    ? <section className="card table-wrap"><table><thead><tr><th>Nama</th><th>Telepon</th><th>Alamat</th><th className="text-right">Limit piutang</th><th></th></tr></thead><tbody>{customers.map((item) => <tr key={item.id}><td className="table-primary">{item.name}</td><td>{item.phone || <span className="table-muted">-</span>}</td><td>{item.address || <span className="table-muted">-</span>}</td><td className="text-right">{item.creditLimit > 0 ? rupiah(item.creditLimit) : <span className="table-muted">Tanpa limit</span>}</td><td>{item.phone && <button className="button button-secondary" style={{ minHeight: 34, padding: "0 11px", fontSize: 11 }} onClick={() => onWhatsApp(item.phone, `Halo ${item.name},`)}>Kirim WA</button>}</td></tr>)}</tbody></table></section>
    : <section className="card card-pad"><p className="table-muted">Belum ada pelanggan. Akan terisi otomatis saat ada penjualan hutang.</p></section>;
  const supplierTable = () => suppliers.length
    ? <section className="card table-wrap"><table><thead><tr><th>Nama</th><th>Telepon</th><th>Alamat</th><th className="text-right">Limit piutang</th></tr></thead><tbody>{suppliers.map((item) => <tr key={item.id}><td className="table-primary">{item.name}</td><td>{item.phone || <span className="table-muted">-</span>}</td><td>{item.address || <span className="table-muted">-</span>}</td><td className="text-right">{item.creditLimit > 0 ? rupiah(item.creditLimit) : <span className="table-muted">Tanpa limit</span>}</td></tr>)}</tbody></table></section>
    : <section className="card card-pad"><p className="table-muted">Belum ada supplier. Akan terisi otomatis saat ada pembelian.</p></section>;
  return <main className="page">
    <PageHeading eyebrow="Operasional" title="Pelanggan & supplier" description="Kelola data kontak bisnis untuk transaksi dan follow-up." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah</button>} />
    <div className="page-card-grid">
      <div className="mini-stat"><span className="mini-stat-label">Pelanggan</span><p className="mini-stat-value">{customers.length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Supplier</span><p className="mini-stat-value">{suppliers.length}</p></div>
    </div>
    <div className="section-header" style={{ marginTop: 18 }}><div><h2>Pelanggan</h2><p>Dipakai untuk penjualan hutang dan piutang</p></div><UserRound size={18} color="var(--primary)" /></div>
    {customerTable()}
    <div className="section-header" style={{ marginTop: 22 }}><div><h2>Supplier</h2><p>Dipakai untuk pembelian bahan dan utang usaha</p></div><Truck size={18} color="var(--primary)" /></div>
    {supplierTable()}
  </main>;
}

function PartyModal({ onClose, onSave }: { onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Tambah pelanggan / supplier" description="Simpan kontak yang sering bertransaksi." onClose={onClose}>
    <form onSubmit={onSave}>
      <div className="form-grid">
        <div className="field"><label htmlFor="partyType">Tipe *</label><select className="select" id="partyType" name="partyType"><option value="CUSTOMER">Pelanggan</option><option value="SUPPLIER">Supplier</option></select></div>
        <div className="field"><label htmlFor="name">Nama *</label><input className="input" id="name" name="name" placeholder="Contoh: Warung Bu Tini" /></div>
        <div className="field"><label htmlFor="phone">Telepon</label><input className="input" id="phone" name="phone" /></div>
        <div className="field"><label htmlFor="creditLimit">Limit piutang</label><input className="input" id="creditLimit" name="creditLimit" type="number" min="0" defaultValue="0" /></div>
        <div className="field full"><label htmlFor="address">Alamat</label><textarea className="textarea" id="address" name="address" /></div>
      </div>
      <ModalFooter onClose={onClose} submitLabel="Simpan" />
    </form>
  </Modal>;
}

function ReceivableView({ receivables, onPay }: { receivables: Receivable[]; onPay: (id: string) => void }) { const outstanding = receivables.reduce((sum, item) => sum + Math.max(0, item.amount - item.paid), 0); const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); const dueSoon = receivables.filter((item) => item.amount > item.paid && item.due <= weekAhead).length; return <main className="page"><PageHeading eyebrow="Keuangan" title="Piutang pelanggan" description="Pantau tagihan yang belum lunas dan terima pembayarannya." action={<button className="button button-secondary" onClick={() => window.print()}><FileDown size={16} />Cetak rekap</button>} /><div className="page-card-grid"><div className="mini-stat"><span className="mini-stat-label">Total piutang</span><p className="mini-stat-value">{rupiah(outstanding)}</p></div><div className="mini-stat"><span className="mini-stat-label">Pelanggan aktif</span><p className="mini-stat-value">{receivables.filter((item) => item.amount > item.paid).length}</p></div><div className="mini-stat"><span className="mini-stat-label">Jatuh tempo 7 hari</span><p className={`mini-stat-value ${dueSoon > 0 ? "negative" : ""}`}>{dueSoon}</p></div></div><section className="card table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Pelanggan</th><th>No. transaksi</th><th>Jatuh tempo</th><th>Total tagihan</th><th>Sisa</th><th>Status</th><th></th></tr></thead><tbody>{receivables.map((item) => { const remaining = item.amount - item.paid; const status = remaining <= 0 ? "LUNAS" : item.paid ? "SEBAGIAN" : "BELUM LUNAS"; return <tr key={item.id}><td className="table-primary">{item.customer}</td><td style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{item.invoice}</td><td className={remaining > 0 ? "negative" : "table-muted"}>{dateLabel(item.due)}</td><td>{rupiah(item.amount)}</td><td className="table-primary">{rupiah(Math.max(0, remaining))}</td><td><span className={`badge ${status === "LUNAS" ? "badge-green" : status === "SEBAGIAN" ? "badge-blue" : "badge-amber"}`}>{status}</span></td><td>{remaining > 0 && <button className="button button-primary" style={{ minHeight: 34, padding: "0 11px", fontSize: 11 }} onClick={() => onPay(item.id)}>Terima bayar</button>}</td></tr>; })}</tbody></table></section></main>; }

function ExpenseView({ expenses, onAdd }: { expenses: Expense[]; onAdd: () => void }) { return <main className="page"><PageHeading eyebrow="Keuangan" title="Pengeluaran" description="Catat biaya operasional supaya laba bersih tidak bias." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah pengeluaran</button>} /><section className="card table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Catatan</th><th className="text-right">Nominal</th><th></th></tr></thead><tbody>{expenses.map((item) => <tr key={item.id}><td className="table-muted">{dateLabel(item.date)}</td><td><span className="badge badge-blue">{item.category}</span></td><td>{item.note || <span className="table-muted">Tidak ada catatan</span>}</td><td className="text-right table-primary">{rupiah(item.amount)}</td><td><button className="button button-ghost"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></section></main>; }

function ReportView({ expenses, exportReport }: { expenses: Expense[]; exportReport: () => void }) { const revenue = 4820000; const cogs = 2265400; const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0); const net = revenue - cogs - expenseTotal; return <main className="page"><PageHeading eyebrow="Keuangan" title="Laporan laba rugi" description="Baca performa usaha dengan angka yang sudah memperhitungkan HPP." action={<button className="button button-secondary" onClick={exportReport}><FileDown size={16} />Export CSV</button>} /><div className="toolbar"><div className="field" style={{ minWidth: 170 }}><label htmlFor="from">Dari tanggal</label><input id="from" className="input" type="date" defaultValue="2026-08-01" /></div><div className="field" style={{ minWidth: 170 }}><label htmlFor="to">Sampai tanggal</label><input id="to" className="input" type="date" defaultValue="2026-08-24" /></div><button className="button button-primary" style={{ marginTop: 21 }}>Terapkan</button></div><div className="kpi-grid"><Kpi label="Omzet" value={rupiah(revenue)} foot={<span>Penjualan berhasil</span>} icon={<TrendingUp size={16} />} /><Kpi label="COGS / HPP" value={rupiah(cogs)} foot={<span>Snapshot saat terjual</span>} icon={<Boxes size={16} />} /><Kpi label="Laba kotor" value={rupiah(revenue - cogs)} foot={<span className="positive">Margin 53%</span>} icon={<BarChart3 size={16} />} /><Kpi label="Net profit" value={rupiah(net)} foot={<span>Setelah pengeluaran</span>} icon={<CircleDollarSign size={16} />} /></div><section className="card card-pad"><div className="section-header"><div><h2>Ringkasan periode</h2><p>1 Agustus 2026 sampai 24 Agustus 2026</p></div><span className="badge badge-green">Profit</span></div><div className="activity-list"><div className="activity-row"><div className="row-main"><strong>Omzet penjualan</strong><span>Transaksi POS yang berhasil</span></div><span className="row-side positive">+ {rupiah(revenue)}</span></div><div className="activity-row"><div className="row-main"><strong>HPP / COGS</strong><span>Harga pokok dari snapshot produk</span></div><span className="row-side negative">- {rupiah(cogs)}</span></div><div className="activity-row"><div className="row-main"><strong>Laba kotor</strong><span>Omzet dikurangi HPP</span></div><span className="row-side">{rupiah(revenue - cogs)}</span></div><div className="activity-row"><div className="row-main"><strong>Pengeluaran operasional</strong><span>{expenses.length} catatan biaya</span></div><span className="row-side negative">- {rupiah(expenseTotal)}</span></div><div className="activity-row"><div className="row-main"><strong>Net profit</strong><span>Laba bersih periode</span></div><span className="row-side positive" style={{ fontSize: 16 }}>{rupiah(net)}</span></div></div></section></main>; }

function SettingsView({ dark, setDark, notify, onReset, onSeed, businessProfile, onSaveProfile }: { dark: boolean; setDark: (value: boolean) => void; notify: (message: string, tone?: Toast["tone"]) => void; onReset: () => Promise<void>; onSeed: () => Promise<void>; businessProfile: BusinessProfile; onSaveProfile: (profile: BusinessProfile) => Promise<void> }) {
  const [busy, setBusy] = useState<"reset" | "seed" | null>(null);
  const runTrialAction = async (kind: "reset" | "seed", action: () => Promise<void>) => { setBusy(kind); try { await action(); } finally { setBusy(null); } };
  const [subscription, setSubscription] = useState<{ currentPlan: string; proPrice: number } | null>(null);
  const [cashiers, setCashiers] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [profileForm, setProfileForm] = useState(businessProfile);
  const [businessId, setBusinessId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  useEffect(() => { setProfileForm(businessProfile); }, [businessProfile]);
  useEffect(() => { if (BACKEND_ENABLED) { backendRequest<{ currentPlan: string; proPrice: number }>("/api/subscription").then(setSubscription).catch(() => undefined); backendRequest<Array<{ id: string; name: string; is_active: boolean }>>("/api/cashiers").then(setCashiers).catch(() => undefined); backendRequest<{ business_id?: string }>("/api/auth/session").then((data) => setBusinessId(String(data?.business_id || ""))).catch(() => undefined); } }, []);
  const saveProfile = async () => {
    if (!profileForm.name.trim()) return notify("Nama usaha wajib diisi.", "error");
    setSavingProfile(true);
    try { await onSaveProfile(profileForm); } catch { /* onSaveProfile already notifies on failure */ } finally { setSavingProfile(false); }
  };
  return <main className="page"><PageHeading eyebrow="Workspace" title="Pengaturan" description="Atur identitas usaha, tim kasir, dan perangkat cetak." action={<button className="button button-primary" disabled={savingProfile} onClick={saveProfile}><Check size={16} />{savingProfile ? "Menyimpan..." : "Simpan perubahan"}</button>} /><div className="split-grid"><section className="card card-pad"><div className="section-header"><div><h2>Paket Langganan</h2><p>Kelola paket dan pembayaran</p></div><CreditCard size={18} color="var(--primary)" /></div><div className="activity-row"><div className="row-main"><strong>Paket saat ini</strong><span>{subscription?.currentPlan || "FREE"}</span></div><span className={`badge ${subscription?.currentPlan === "PRO" ? "badge-green" : "badge-emerald"}`}>{subscription?.currentPlan || "FREE"}</span></div>{subscription?.currentPlan !== "PRO" && <><div className="callout" style={{ marginTop: 12 }}><Sparkles size={17} /><div><strong>Upgrade ke PRO</strong><p>Transaksi tanpa batas, produk unlimited, dan laporan lengkap.</p></div></div><a href="/pricing" className="button button-primary" style={{ width: "100%", marginTop: 12, textAlign: "center", display: "block" }}>Upgrade ke PRO <ChevronRight size={14} /></a></>}</section><section className="card card-pad"><div className="section-header"><div><h2>Profil usaha</h2><p>Tampil di struk pelanggan</p></div><Store size={18} color="var(--primary)" /></div><div className="form-grid"><div className="field full"><label htmlFor="business">Nama usaha</label><input className="input" id="business" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} /></div><div className="field"><label htmlFor="phone">Nomor telepon</label><input className="input" id="phone" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} /></div><div className="field"><label htmlFor="paper">Lebar kertas</label><select className="select" id="paper" value={profileForm.paper_width} onChange={(event) => setProfileForm((current) => ({ ...current, paper_width: Number(event.target.value) === 80 ? 80 : 58 }))}><option value="58">58 mm</option><option value="80">80 mm</option></select></div><div className="field full"><label htmlFor="address">Alamat usaha</label><textarea className="textarea" id="address" value={profileForm.address} onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))} /></div><div className="field full"><label htmlFor="footer">Footer struk</label><input className="input" id="footer" value={profileForm.receipt_footer} onChange={(event) => setProfileForm((current) => ({ ...current, receipt_footer: event.target.value }))} /></div></div></section><div className="dashboard-stack"><section className="card card-pad"><div className="section-header"><div><h2>Printer thermal</h2><p>Bluetooth dan struk digital</p></div><Printer size={18} color="var(--primary)" /></div><div className="callout success"><Check size={17} /><div><strong>Struk digital selalu siap</strong><p>Printer belum dipasangkan. Transaksi tetap aman tersimpan.</p></div></div><button className="button button-secondary" style={{ width: "100%", marginTop: 14 }} onClick={() => notify("Browser akan meminta izin Bluetooth saat printer dipilih.", "default")}><Printer size={16} />Hubungkan printer Bluetooth</button></section><section className="card card-pad"><div className="section-header"><div><h2>Tampilan</h2><p>Sesuaikan kenyamanan kerja</p></div><Sparkles size={17} color="var(--primary)" /></div><div className="activity-row"><div className="row-main"><strong>Mode gelap</strong><span>Lebih nyaman untuk shift malam</span></div><button className={`button ${dark ? "button-primary" : "button-secondary"}`} onClick={() => setDark(!dark)}>{dark ? "Aktif" : "Nonaktif"}</button></div></section><section className="card card-pad"><div className="section-header"><div><h2>Tim kasir</h2><p>{cashiers.length} kasir terdaftar</p></div><button className="section-link" onClick={() => setShowCashierModal(true)}>Kelola</button></div>{cashiers.length > 0 ? cashiers.map((c) => <div className="activity-row" key={c.id}><div className="avatar">{c.name.slice(0,2).toUpperCase()}</div><div className="row-main"><strong>{c.name}</strong><span>Kasir · {c.is_active ? "Aktif" : "Nonaktif"}</span></div><span className="status-dot" style={{ background: c.is_active ? "var(--success)" : "var(--muted)" }} /></div>) : <p className="table-muted">Belum ada kasir terdaftar.</p>}<button className="button button-secondary" style={{ width: "100%", marginTop: 12 }} onClick={() => setShowCashierModal(true)}>+ Tambah Kasir</button>{businessId && <div className="callout" style={{ marginTop: 12 }}><QrCode size={17} /><div><strong>Tautan masuk kasir</strong><p style={{ wordBreak: "break-all", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{`${typeof window === "undefined" ? "" : window.location.origin}/cashier-login?b=${businessId}`}</p><button className="button button-secondary" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/cashier-login?b=${businessId}`).then(() => notify("Tautan kasir disalin."), () => notify("Gagal menyalin tautan.", "error")); }}>Salin tautan</button></div></div>}</section>{TRIAL_TOOLS && <section className="card card-pad"><div className="section-header"><div><h2>Mode trial</h2><p>Alat bantu sebelum dipakai client</p></div><SlidersHorizontal size={17} color="var(--primary)" /></div><div className="callout warning"><Sparkles size={17} /><div><strong>Hanya untuk uji coba</strong><p>Isi data dummy untuk demo, atau kosongkan seluruh data sebelum serah terima. Nonaktifkan lewat env NEXT_PUBLIC_TRIAL_TOOLS=false.</p></div></div><button className="button button-secondary" style={{ width: "100%", marginTop: 14 }} disabled={busy !== null} onClick={() => runTrialAction("seed", onSeed)}><Sparkles size={16} />{busy === "seed" ? "Menyiapkan data..." : "Isi data dummy"}</button><button className="button button-danger" style={{ width: "100%", marginTop: 10 }} disabled={busy !== null} onClick={() => runTrialAction("reset", onReset)}><Trash2 size={16} />{busy === "reset" ? "Menghapus..." : "Hapus semua data"}</button></section>}</div></div>{showCashierModal && <CashierModal cashiers={cashiers} onClose={() => setShowCashierModal(false)} onSaved={(newCashier) => { setCashiers((prev) => [...prev, newCashier]); setShowCashierModal(false); notify("Kasir berhasil ditambahkan."); }} />}</main>; }

function ItemModal({ kind, onClose, onSave }: { kind: "product" | "material"; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>, kind: "product" | "material") => void }) { const product = kind === "product"; return <Modal title={product ? "Tambah produk jadi" : "Tambah bahan baku"} description={product ? "Produk akan tersedia di katalog kasir setelah disimpan." : "Gunakan satuan standar agar stok tetap konsisten."} onClose={onClose}><form onSubmit={(event) => onSave(event, kind)}><div className="form-grid"><div className="field full"><label htmlFor="name">Nama item <span>*</span></label><input className="input" id="name" name="name" autoFocus placeholder={product ? "Contoh: Sambal Terasi 150g" : "Contoh: Cabai keriting"} /></div>{product && <div className="field"><label htmlFor="category">Kategori <span>*</span></label><select className="select" id="category" name="category" defaultValue="Sambal"><option>Sambal</option><option>Minyak</option><option>Frozen</option><option>Paket</option><option>Lainnya</option></select></div>}<div className="field"><label htmlFor="unit">Satuan <span>*</span></label><select className="select" id="unit" name="unit" defaultValue=""><option value="" disabled>Pilih satuan</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="liter">liter</option><option value="pcs">pcs</option><option value="botol">botol</option><option value="jar">jar</option></select></div><div className="field"><label htmlFor="price">{product ? "Harga jual" : "Harga beli terakhir"} <span>*</span></label><input className="input" id="price" name="price" type="number" min="0" placeholder="0" /></div><div className="field"><label htmlFor="stock">Stok awal <span>*</span></label><input className="input" id="stock" name="stock" type="number" min="0" step="0.01" placeholder="0" /></div>{!product && <div className="field"><label htmlFor="supplier">Supplier default</label><select className="select" id="supplier" name="supplier" defaultValue="Pasar Segar Bu Ani"><option>Pasar Segar Bu Ani</option><option>CV Sumber Pangan</option><option>Kemasan Kita</option></select></div>}</div><ModalFooter onClose={onClose} submitLabel={product ? "Simpan produk" : "Simpan bahan"} /></form></Modal>; }

function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal title="Tambah pengeluaran" description="Catat biaya yang keluar dari operasional usaha." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field"><label htmlFor="date">Tanggal <span>*</span></label><input className="input" id="date" name="date" type="date" defaultValue="2026-08-24" /></div><div className="field"><label htmlFor="category">Kategori <span>*</span></label><select className="select" id="category" name="category" defaultValue="Kemasan"><option>Bahan</option><option>Kemasan</option><option>Gas</option><option>Listrik</option><option>Sewa</option><option>Gaji</option><option>Transport</option><option>Lain-lain</option></select></div><div className="field full"><label htmlFor="amount">Nominal <span>*</span></label><input className="input" id="amount" name="amount" type="number" min="1" placeholder="0" /></div><div className="field full"><label htmlFor="note">Catatan</label><textarea className="textarea" id="note" name="note" placeholder="Contoh: Isi ulang gas untuk produksi batch pagi" /></div></div><ModalFooter onClose={onClose} submitLabel="Simpan pengeluaran" /></form></Modal>; }

function ProductionModal({ products, materials, onClose, onSave }: { products: Product[]; materials: Material[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal large title="Buat batch produksi" description="Stok bahan berkurang dan HPP produk diperbarui otomatis." onClose={onClose}><div className="process-steps"><div className="process-step active"><span className="step-number">1</span>Output</div><span className="step-line" /><div className="process-step active"><span className="step-number">2</span>Bahan baku</div><span className="step-line" /><div className="process-step"><span className="step-number">3</span>Review</div></div><form onSubmit={onSave}><div className="form-grid"><div className="field"><label htmlFor="output">Produk output <span>*</span></label><select className="select" id="output" name="output" defaultValue=""><option value="" disabled>Pilih produk jadi</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="outputQty">Qty hasil <span>*</span></label><input className="input" id="outputQty" name="outputQty" type="number" min="1" step="0.01" placeholder="50" /></div><div className="field full"><label htmlFor="material">Bahan baku utama <span>*</span></label><select className="select" id="material" name="material" defaultValue=""><option value="" disabled>Pilih bahan baku</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} · tersedia {item.stock} {item.unit}</option>)}</select></div><div className="field"><label htmlFor="materialQty">Qty digunakan <span>*</span></label><input className="input" id="materialQty" name="materialQty" type="number" min="0.01" step="0.01" placeholder="2.5" /></div><div className="field"><label htmlFor="otherCost">Biaya lain</label><input className="input" id="otherCost" name="otherCost" type="number" min="0" placeholder="0" /></div></div><div className="callout" style={{ marginTop: 16 }}><CircleDollarSign size={17} /><div><strong>HPP dihitung saat disimpan</strong><p>Rumus: (total bahan + biaya lain) / jumlah output.</p></div></div><ModalFooter onClose={onClose} submitLabel="Simpan batch" /></form></Modal>; }

function PurchaseModal({ materials, onClose, onSave }: { materials: Material[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal title="Catat pembelian" description="Stok bahan dan harga beli terakhir akan langsung diperbarui." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field full"><label htmlFor="supplier">Supplier <span>*</span></label><select className="select" id="supplier" name="supplier" defaultValue=""><option value="" disabled>Pilih supplier</option><option>Pasar Segar Bu Ani</option><option>CV Sumber Pangan</option><option>Kemasan Kita</option></select></div><div className="field full"><label htmlFor="material">Bahan baku <span>*</span></label><select className="select" id="material" name="material" defaultValue=""><option value="" disabled>Pilih bahan</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></div><div className="field"><label htmlFor="qty">Kuantitas <span>*</span></label><input className="input" id="qty" name="qty" type="number" min="0.01" step="0.01" placeholder="0" /></div><div className="field"><label htmlFor="price">Harga / unit <span>*</span></label><input className="input" id="price" name="price" type="number" min="0" placeholder="0" /></div><div className="field full"><label htmlFor="status">Status pembayaran</label><select className="select" id="status" name="status" defaultValue="LUNAS"><option value="LUNAS">Lunas</option><option value="UTANG">Hutang supplier</option></select></div></div><ModalFooter onClose={onClose} submitLabel="Simpan pembelian" /></form></Modal>; }

function PaymentModal({ total, customers, onCreateCustomer, onClose, onPay }: { total: number; customers: string[]; onCreateCustomer: (name: string) => Promise<string | null>; onClose: () => void; onPay: (method: PaymentMethod, cash: number, customer: string, due: string, override: string, discount: number) => void }) {
  const [method, setMethod] = useState<PaymentMethod>('TUNAI'); const [cash, setCash] = useState(total); const [customer, setCustomer] = useState(''); const [due, setDue] = useState('2026-08-31'); const [override, setOverride] = useState(''); const [creating, setCreating] = useState(false); const [discount, setDiscount] = useState(0); const payableTotal = Math.max(0, total - discount);
  const methods: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [{ id: 'TUNAI', label: 'Tunai', icon: CircleDollarSign }, { id: 'QRIS', label: 'QRIS', icon: QrCode }, { id: 'TRANSFER', label: 'Transfer', icon: CreditCard }, { id: 'HUTANG', label: 'Hutang', icon: ClipboardList }];
  const createCustomer = async () => { if (!customer.trim()) return; setCreating(true); const name = await onCreateCustomer(customer); if (name) setCustomer(name); setCreating(false); };
  return <Modal title="Pembayaran" description="Pilih metode pembayaran untuk menyelesaikan transaksi." onClose={onClose}><div className="amount-preview"><span>Total tagihan</span><strong>{rupiah(payableTotal)}</strong></div><div className="field" style={{ marginTop: 12 }}><label htmlFor="discount">Diskon (Rp)</label><input className="input" id="discount" type="number" min="0" max={total} value={discount || ""} placeholder="0" onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))} /></div><div className="modal-divider" /><div className="field"><label>Metode pembayaran</label><div className="payment-methods">{methods.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={`payment-method ${method === item.id ? 'active' : ''}`} onClick={() => setMethod(item.id)}><Icon size={18} />{item.label}</button>; })}</div></div>{method === 'TUNAI' && <div className="form-grid" style={{ marginTop: 17 }}><div className="field full"><label htmlFor="cash">Uang diterima</label><input className="input" id="cash" type="number" min={payableTotal} value={cash} onChange={(event) => setCash(Number(event.target.value))} /></div><div className="callout success field full"><CircleDollarSign size={17} /><div><strong>Kembalian {cash >= payableTotal ? rupiah(cash - payableTotal) : 'Belum cukup'}</strong><p>{cash >= payableTotal ? 'Nominal siap dikonfirmasi.' : `Kurang ${rupiah(payableTotal - cash)}`}</p></div></div></div>}{method === 'HUTANG' && <div className="form-grid" style={{ marginTop: 17 }}><div className="field full"><label htmlFor="customer">Nama pelanggan</label><div style={{ display: 'flex', gap: 8 }}><input className="input" id="customer" value={customer} onChange={(event) => setCustomer(event.target.value)} list="customer-options" placeholder="Pilih atau ketik nama pelanggan" /><button type="button" className="button button-secondary" disabled={creating || !customer.trim() || customers.some((name) => name.toLowerCase() === customer.trim().toLowerCase())} onClick={createCustomer}>{creating ? 'Menyimpan...' : 'New Customer'}</button></div><datalist id="customer-options">{customers.map((name) => <option key={name} value={name} />)}</datalist></div><div className="field"><label htmlFor="due">Jatuh tempo</label><input className="input" id="due" type="date" value={due} onChange={(event) => setDue(event.target.value)} /></div><div className="field full"><label htmlFor="override">Alasan override stok (jika perlu)</label><textarea className="textarea" id="override" value={override} onChange={(event) => setOverride(event.target.value)} /></div></div>}<div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Batal</button><button type="button" className="button button-primary" onClick={() => onPay(method, cash, customer, due, override, discount)}>Bayar sekarang<Check size={16} /></button></div></Modal>;
}function ShieldIcon() { return <span style={{ display: "grid", placeItems: "center", width: 17, height: 17, border: "2px solid currentColor", borderRadius: "50%", fontSize: 9 }}>✓</span>; }
function ReceiptModal({ sale, onClose, onPrint }: { sale: { id: string; subtotal: number; discount: number; total: number; method: PaymentMethod; paid: number; change: number; items: CartItem[] }; onClose: () => void; onPrint: () => void }) { return <Modal title="Transaksi berhasil" description={`Nomor transaksi ${sale.id}`} onClose={onClose}><div className="receipt"><div className="receipt-head"><strong>DAPUR SARI NUSANTARA</strong><span>Jl. Melati No. 18, Bandung</span><span>24 Agustus 2026 · 10:42</span></div>{sale.items.map((item) => <div className="receipt-line" key={item.id}><span>{item.name} x{item.qty}</span><strong>{rupiah(item.price * item.qty)}</strong></div>)}<div className="receipt-line"><span>Subtotal</span><strong>{rupiah(sale.subtotal)}</strong></div>{sale.discount > 0 && <div className="receipt-line"><span>Diskon</span><strong>-{rupiah(sale.discount)}</strong></div>}<div className="receipt-line receipt-total"><span>TOTAL</span><strong>{rupiah(sale.total)}</strong></div><div className="receipt-line"><span>{sale.method}</span><span>{rupiah(sale.paid)}</span></div>{sale.change > 0 && <div className="receipt-line"><span>Kembalian</span><strong>{rupiah(sale.change)}</strong></div>}<div className="receipt-foot">Terima kasih sudah mendukung usaha lokal.</div></div><div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}><button className="button button-secondary" onClick={onPrint}><Printer size={16} />Cetak struk</button><button className="button button-primary" onClick={() => { navigator.share?.({ title: "Struk DapurKasir", text: `Transaksi ${sale.id} sebesar ${rupiah(sale.total)}` }); }}>Bagikan struk</button></div><button className="button button-ghost" style={{ width: "100%" }} onClick={onClose}>Transaksi baru</button></Modal>; }

function Modal({ title, description, children, onClose, large }: { title: string; description?: string; children: ReactNode; onClose: () => void; large?: boolean }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${large ? "large" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={17} /></button></div><div className="modal-body">{children}</div></div></div>; }
function ModalFooter({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) { return <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Batal</button><button type="submit" className="button button-primary">{submitLabel}<Check size={16} /></button></div>; }

  function PurchaseView2({ purchases, materials, onAdd, onPay, onReturn }: { purchases: Purchase[]; materials: Material[]; onAdd: () => void; onPay: (id: string) => void; onReturn: () => void }) { const debt = purchases.reduce((sum, item) => sum + item.remaining, 0); return <main className="page"><PageHeading eyebrow="Operasional" title="Pembelian bahan" description="Catat pembelian, pembayaran parsial, dan utang supplier." action={<><button className="button button-secondary" onClick={onReturn}><Package size={16} />Retur ke supplier</button><button className="button button-primary" onClick={onAdd}><Plus size={17} />Catat pembelian</button></>} /><div className="page-card-grid"><div className="mini-stat"><span className="mini-stat-label">Total pembelian</span><p className="mini-stat-value">{shortRupiah(purchases.reduce((sum, item) => sum + item.total, 0))}</p></div><div className="mini-stat"><span className="mini-stat-label">Sisa utang</span><p className="mini-stat-value negative">{shortRupiah(debt)}</p></div><div className="mini-stat"><span className="mini-stat-label">Transaksi</span><p className="mini-stat-value">{purchases.length}</p></div></div><section className="card table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th></th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td className="table-muted">{dateLabel(purchase.date)}</td><td className="table-primary">{purchase.supplier}</td><td>{rupiah(purchase.total)}</td><td>{rupiah(purchase.paid)}</td><td className="negative">{rupiah(purchase.remaining)}</td><td><span className={`badge ${purchase.status === "LUNAS" ? "badge-green" : "badge-amber"}`}>{purchase.status === "LUNAS" ? "Lunas" : purchase.status === "SEBAGIAN" ? "Sebagian" : "Belum lunas"}</span></td><td>{purchase.remaining > 0 && <button className="button button-primary" style={{ minHeight: 34, padding: "0 11px", fontSize: 11 }} onClick={() => onPay(purchase.payableId || purchase.id)}>Bayar</button>}</td></tr>)}</tbody></table></section></main>; }

 function ReportView2({ expenses, capitalEntries, purchases, receivables, products, sales, exportReport, onAddCapital }: { expenses: Expense[]; capitalEntries: CapitalEntry[]; purchases: Purchase[]; receivables: Receivable[]; products: Product[]; sales: SaleSummary[]; exportReport: () => void; onAddCapital: () => void }) {
  const [tab, setTab] = useState("pnl");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${todayIso.slice(0, 7)}-01`);
  const [to, setTo] = useState(todayIso);
  const [server, setServer] = useState<PnlReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // The server recomputes COGS from transaction_items; the client copy of `sales`
  // carries cogs: 0, so local numbers understate cost of goods badly. Prefer the API.
  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    let cancelled = false;
    setLoadingReport(true);
    backendRequest<PnlReport>(`/api/reports/pnl?dateFrom=${from}&dateTo=${to}`)
      .then((data) => { if (!cancelled) setServer(data); })
      .catch(() => { if (!cancelled) setServer(null); })
      .finally(() => { if (!cancelled) setLoadingReport(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  const inRange = (date: string) => date >= from && date <= to;
  const localOperating = expenses.filter((item) => item.type !== "OWNER_WITHDRAWAL" && inRange(item.date)).reduce((sum, item) => sum + item.amount, 0);
  const ownerExpenses = expenses.filter((item) => item.type === "OWNER_WITHDRAWAL" && inRange(item.date)).reduce((sum, item) => sum + item.amount, 0);
  const localRevenue = sales.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.total, 0);
  const localCogs = sales.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.cogs, 0);
  const localCash = capitalEntries.filter((item) => inRange(item.date)).reduce((sum, item) => sum + (item.type === "WITHDRAWAL" ? -item.amount : item.amount), 0) + localRevenue - purchases.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.paid, 0) - localOperating - ownerExpenses;

  const revenue = server?.revenue ?? localRevenue;
  const cogs = server?.cogs ?? localCogs;
  const operating = server?.expenses ?? localOperating;
  const net = server?.net_profit ?? (revenue - cogs - operating);
  const cash = server?.balance_sheet.cash ?? localCash;
  const inventory = server?.balance_sheet.inventory ?? products.reduce((sum, item) => sum + item.stock * item.cogs, 0);
  const receivableBalance = server?.balance_sheet.receivables ?? receivables.reduce((sum, item) => sum + item.amount - item.paid, 0);
  const payableBalance = server?.balance_sheet.payables ?? purchases.reduce((sum, item) => sum + item.remaining, 0);
  const withdrawals = capitalEntries.filter((item) => item.type === "WITHDRAWAL" && inRange(item.date)).reduce((sum, item) => sum + item.amount, 0) + ownerExpenses;

  return <main className="page"><PageHeading eyebrow="Keuangan" title="Laporan" description="Laba rugi, arus kas, dan neraca dengan filter periode." action={<><button className="button button-secondary" onClick={onAddCapital}><Plus size={16} />Catat modal / prive</button><button className="button button-secondary" onClick={exportReport}><FileDown size={16} />Export CSV</button></>} /><div className="toolbar"><div className="field"><label>Dari tanggal</label><input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div className="field"><label>Sampai tanggal</label><input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></div><div className="category-row"><button className={`category-chip ${tab === "pnl" ? "active" : ""}`} onClick={() => setTab("pnl")}>Laporan Laba Rugi</button><button className={`category-chip ${tab === "cash" ? "active" : ""}`} onClick={() => setTab("cash")}>Laporan Arus Kas</button><button className={`category-chip ${tab === "balance" ? "active" : ""}`} onClick={() => setTab("balance")}>Laporan Neraca</button></div>{tab === "pnl" && <><div className="kpi-grid"><Kpi label="Omzet" value={rupiah(revenue)} foot={<span>Penjualan pada periode</span>} icon={<TrendingUp size={16} />} /><Kpi label="COGS / HPP" value={rupiah(cogs)} foot={<span>HPP transaksi</span>} icon={<Boxes size={16} />} /><Kpi label="Laba Kotor" value={rupiah(revenue - cogs)} foot={<span>Margin {revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 100) : 0}%</span>} icon={<TrendingUp size={16} />} /><Kpi label="Beban operasional" value={rupiah(operating)} foot={<span>Prive tidak termasuk</span>} icon={<CircleDollarSign size={16} />} /><Kpi label="Laba bersih" value={rupiah(net)} foot={<span>{loadingReport ? "Memuat..." : server ? "Dihitung server" : "Perkiraan lokal"}</span>} icon={<BarChart3 size={16} />} /></div><section className="card card-pad" style={{ marginTop: 18 }}><h2 style={{ fontSize: 15, marginBottom: 12 }}>Rincian Laba Rugi</h2><div className="activity-list"><div className="activity-row"><span className="row-main">Omzet (Revenue)</span><span className="row-side">{rupiah(revenue)}</span></div><div className="activity-row"><span className="row-main">HPP / COGS</span><span className="row-side negative">({rupiah(cogs)})</span></div><div className="activity-row" style={{ fontWeight: 600 }}><span className="row-main">Laba Kotor</span><span className="row-side"><span className="badge badge-blue">{rupiah(revenue - cogs)}</span></span></div><div className="activity-row"><span className="row-main">Beban Operasional</span><span className="row-side negative">({rupiah(operating)})</span></div><div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}><span className="row-main">Laba Bersih</span><span className="row-side"><span className={`badge ${net >= 0 ? "badge-green" : "badge-red"}`}>{rupiah(net)}</span></span></div></div></section></>}{tab === "cash" && <><section className="card card-pad"><h2 style={{ fontSize: 15, marginBottom: 12 }}>Arus Kas Operasi</h2><div className="activity-list"><div className="activity-row"><span className="row-main">Pemasukan dari penjualan</span><span className="row-side"><span className="badge badge-green">+{rupiah(revenue)}</span></span></div><div className="activity-row"><span className="row-main">Pengeluaran pembelian bahan</span><span className="row-side negative">({rupiah(purchases.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.paid, 0))})</span></div><div className="activity-row"><span className="row-main">Beban operasional</span><span className="row-side negative">({rupiah(operating)})</span></div><div className="activity-row" style={{ fontWeight: 600 }}><span className="row-main">Arus kas dari operasi</span><span className="row-side">{rupiah(revenue - purchases.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.paid, 0) - operating)}</span></div></div></section><section className="card card-pad" style={{ marginTop: 12 }}><h2 style={{ fontSize: 15, marginBottom: 12 }}>Arus Kas Pendanaan</h2><div className="activity-list"><div className="activity-row"><span className="row-main">Modal masuk</span><span className="row-side"><span className="badge badge-green">+{rupiah(capitalEntries.filter((item) => item.type !== "WITHDRAWAL" && inRange(item.date)).reduce((sum, item) => sum + item.amount, 0))}</span></span></div><div className="activity-row"><span className="row-main">Prive / tarik modal</span><span className="row-side negative">({rupiah(withdrawals)})</span></div><div className="activity-row" style={{ fontWeight: 600 }}><span className="row-main">Arus kas dari pendanaan</span><span className="row-side">{rupiah(capitalEntries.filter((item) => item.type !== "WITHDRAWAL" && inRange(item.date)).reduce((sum, item) => sum + item.amount, 0) - withdrawals)}</span></div></div></section><section className="card card-pad" style={{ marginTop: 12 }}><div className="kpi-grid"><Kpi label="Perubahan Kas Bersih" value={rupiah(cash)} foot={<span>Kas awal periode + perubahan</span>} icon={<CircleDollarSign size={16} />} /></div></section></>}{tab === "balance" && <><section className="card card-pad"><h2 style={{ fontSize: 15, marginBottom: 12 }}>Aset</h2><div className="activity-list"><div className="activity-row"><span className="row-main">Kas</span><span className="row-side">{rupiah(cash)}</span></div><div className="activity-row"><span className="row-main">Piutang Usaha</span><span className="row-side">{rupiah(receivableBalance)}</span></div><div className="activity-row"><span className="row-main">Persediaan</span><span className="row-side">{rupiah(inventory)}</span></div><div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}><span className="row-main">Total Aset</span><span className="row-side"><span className="badge badge-blue">{rupiah(cash + receivableBalance + inventory)}</span></span></div></div></section><section className="card card-pad" style={{ marginTop: 12 }}><h2 style={{ fontSize: 15, marginBottom: 12 }}>Kewajiban</h2><div className="activity-list"><div className="activity-row"><span className="row-main">Utang Usaha</span><span className="row-side">{rupiah(payableBalance)}</span></div><div className="activity-row" style={{ fontWeight: 700 }}><span className="row-main">Total Kewajiban</span><span className="row-side"><span className="badge badge-amber">{rupiah(payableBalance)}</span></span></div></div></section><section className="card card-pad" style={{ marginTop: 12 }}><h2 style={{ fontSize: 15, marginBottom: 12 }}>Ekuitas</h2><div className="activity-list"><div className="activity-row"><span className="row-main">Modal</span><span className="row-side">{rupiah(capitalEntries.filter((item) => item.type !== "WITHDRAWAL").reduce((sum, item) => sum + item.amount, 0))}</span></div><div className="activity-row"><span className="row-main">Prive / tarik modal</span><span className="row-side negative">({rupiah(withdrawals)})</span></div><div className="activity-row"><span className="row-main">Laba Ditahan</span><span className="row-side">{rupiah(net)}</span></div><div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}><span className="row-main">Total Ekuitas</span><span className="row-side"><span className="badge badge-green">{rupiah(capitalEntries.filter((item) => item.type !== "WITHDRAWAL").reduce((sum, item) => sum + item.amount, 0) - withdrawals + net)}</span></span></div></div></section><section className="card card-pad" style={{ marginTop: 12, background: "var(--accent-bg, #f0fdf4)" }}><div className="activity-list"><div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}><span className="row-main">Kewajiban + Ekuitas</span><span className="row-side"><span className="badge badge-blue">{rupiah(payableBalance + capitalEntries.filter((item) => item.type !== "WITHDRAWAL").reduce((sum, item) => sum + item.amount, 0) - withdrawals + net)}</span></span></div></div></section></>}<section className="card card-pad" style={{ marginTop: 18 }}><h2>Modal dan prive</h2>{capitalEntries.filter((item) => inRange(item.date)).map((item) => <div className="activity-row" key={item.id}><span>{item.type === "WITHDRAWAL" ? "Prive" : item.type === "INITIAL" ? "Modal awal" : "Tambahan modal"}</span><strong>{rupiah(item.amount)}</strong></div>)}</section></main>; }

function ExpenseModal2({ onClose, onSave }: { onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal title="Tambah pengeluaran" description="Pisahkan beban operasional dari prive pemilik." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field"><label htmlFor="date">Tanggal *</label><input className="input" id="date" name="date" type="date" defaultValue="2026-08-24" /></div><div className="field"><label htmlFor="expenseType">Jenis</label><select className="select" id="expenseType" name="expenseType"><option value="OPERATING">Beban operasional</option><option value="OWNER_WITHDRAWAL">Prive / tarik modal</option></select></div><div className="field"><label htmlFor="category">Kategori *</label><input className="input" id="category" name="category" defaultValue="Operasional" /></div><div className="field"><label htmlFor="amount">Nominal *</label><input className="input" id="amount" name="amount" type="number" min="1" /></div><div className="field full"><label htmlFor="note">Catatan</label><textarea className="textarea" id="note" name="note" /></div></div><ModalFooter onClose={onClose} submitLabel="Simpan pengeluaran" /></form></Modal>; }

function ProductionModal2({ products, materials, onClose, onSave }: { products: Product[]; materials: Material[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { const [matRows, setMatRows] = useState([0]); const [outRows, setOutRows] = useState([0]); return <Modal large title="Buat batch produksi" description="Satu batch bisa menghasilkan beberapa produk kemasan." onClose={onClose}><form onSubmit={onSave}><div className="section-header"><h2>Produk output</h2><button type="button" className="button button-secondary" onClick={() => setOutRows((c) => [...c, c.length])}><Plus size={15} />Tambah kemasan</button></div>{outRows.map((row, i) => <div className="form-grid" key={`out-${row}`} style={{ marginTop: 8 }}><div className="field"><label>{i === 0 ? 'Produk output *' : `Output ${i + 1}`}</label><select className="select" name="output" defaultValue=""><option value="" disabled>Pilih produk</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Qty hasil *</label><input className="input" name="outputQty" type="number" min="0.01" step="0.01" placeholder="0" /></div>{outRows.length > 1 && <button type="button" className="button button-ghost" onClick={() => setOutRows((c) => c.filter((v) => v !== row))} style={{ alignSelf: 'end' }}><Trash2 size={16} /></button>}</div>)}<div className="section-header" style={{ marginTop: 18 }}><h2>Bahan baku</h2><button type="button" className="button button-secondary" onClick={() => setMatRows((c) => [...c, c.length])}><Plus size={15} />Tambah bahan</button></div>{matRows.map((row, index) => <div className="form-grid" key={`mat-${row}`} style={{ marginTop: 8 }}><div className="field"><label>Bahan {index + 1} *</label><select className="select" name="material" defaultValue=""><option value="" disabled>Pilih bahan</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock} {item.unit})</option>)}</select></div><div className="field"><label>Qty digunakan *</label><input className="input" name="materialQty" type="number" min="0.01" step="0.01" /></div>{matRows.length > 1 && <button type="button" className="button button-ghost" onClick={() => setMatRows((c) => c.filter((v) => v !== row))}><Trash2 size={16} /></button>}</div>)}<div className="field" style={{ marginTop: 12 }}><label>Biaya lain</label><input className="input" name="otherCost" type="number" min="0" /></div><ModalFooter onClose={onClose} submitLabel="Selesaikan batch" /></form></Modal>; }

function PurchaseModal2({ materials, suppliers, onCreateSupplier, onClose, onSave }: { materials: Material[]; suppliers: string[]; onCreateSupplier: (name: string) => Promise<string | null>; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const [supplier, setSupplier] = useState(''); const [creating, setCreating] = useState(false);
  const createSupplier = async () => { if (!supplier.trim()) return; setCreating(true); const name = await onCreateSupplier(supplier); if (name) setSupplier(name); setCreating(false); };
  return <Modal title="Catat pembelian" description="Pembayaran awal dapat sebagian atau nol." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field full"><label htmlFor="purchase-supplier">Supplier *</label><div style={{ display: 'flex', gap: 8 }}><input className="input" id="purchase-supplier" name="supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)} list="supplier-options" placeholder="Pilih atau ketik nama supplier" required /><button type="button" className="button button-secondary" disabled={creating || !supplier.trim() || suppliers.some((name) => name.toLowerCase() === supplier.trim().toLowerCase())} onClick={createSupplier}>{creating ? 'Menyimpan...' : 'New Supplier'}</button></div><datalist id="supplier-options">{suppliers.map((name) => <option key={name} value={name} />)}</datalist></div><div className="field full"><label>Bahan baku *</label><select className="select" name="material" defaultValue=""><option value="" disabled>Pilih bahan</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></div><div className="field"><label>Kuantitas *</label><input className="input" name="qty" type="number" min="0.01" step="0.01" /></div><div className="field"><label>Harga / unit *</label><input className="input" name="price" type="number" min="0" /></div><div className="field"><label>Dibayar sekarang</label><input className="input" name="paid" type="number" min="0" defaultValue="0" /></div><div className="field"><label>Metode pembayaran</label><select className="select" name="paymentMethod"><option>TUNAI</option><option>TRANSFER</option><option>QRIS</option></select></div><div className="field full"><label>Jatuh tempo</label><input className="input" name="dueDate" type="date" /></div></div><ModalFooter onClose={onClose} submitLabel="Simpan pembelian" /></form></Modal>;
}function CapitalModal({ onClose, onSave }: { onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal title="Catat modal / prive" description="Modal menambah ekuitas; prive mengurangi ekuitas dan tidak masuk laba rugi." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field full"><label>Jenis transaksi</label><select className="select" name="type"><option value="INITIAL">Modal awal</option><option value="ADDITION">Tambahan modal</option><option value="WITHDRAWAL">Prive / tarik modal</option></select></div><div className="field"><label>Tanggal *</label><input className="input" name="date" type="date" defaultValue="2026-08-24" /></div><div className="field"><label>Nominal *</label><input className="input" name="amount" type="number" min="1" /></div><div className="field full"><label>Catatan</label><textarea className="textarea" name="note" /></div></div><ModalFooter onClose={onClose} submitLabel="Simpan transaksi" /></form></Modal>; }

function CashierModal({ cashiers, onClose, onSaved }: { cashiers: Array<{ id: string; name: string; is_active: boolean }>; onClose: () => void; onSaved: (cashier: { id: string; name: string; is_active: boolean }) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nama kasir wajib diisi.");
    if (!/^\d{6}$/.test(pin)) return setError("PIN harus 6 digit angka.");
    setLoading(true);
    try {
      const result = await backendRequest<{ id: string; name: string; is_active: boolean }>("/api/cashiers", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), pin }),
      });
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah kasir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Kelola Kasir" description="Tambah dan kelola akun kasir untuk POS." onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field full">
            <label>Nama kasir *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap kasir" />
          </div>
          <div className="field full">
            <label>PIN 6 digit *</label>
            <input className="input" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Contoh: 123456" maxLength={6} />
          </div>
        </div>
        {error && <div className="callout error" style={{ marginTop: 12 }}>{error}</div>}
        <div className="modal-footer" style={{ padding: "16px 0 0" }}>
          <button type="button" className="button button-secondary" onClick={onClose}>Tutup</button>
          <button type="submit" className="button button-primary" disabled={loading}>{loading ? "Menyimpan..." : "Tambah Kasir"}<Check size={16} /></button>
        </div>
      </form>
      {cashiers.length > 0 && (
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Kasir Terdaftar</h3>
          {cashiers.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <strong>{c.name}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, color: "var(--muted)" }}>{c.is_active ? "Aktif" : "Nonaktif"}</span>
              </div>
              <span className={`badge ${c.is_active ? "badge-green" : "badge-amber"}`}>{c.is_active ? "Aktif" : "Nonaktif"}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
function B2BOrderView({ orders, onAdd, onConfirm }: { orders: SalesOrder[]; onAdd: () => void; onConfirm: (id: string) => void }) {
  const statusBadge = (status: SalesOrder["status"]) => {
    const map: Record<string, string> = { DRAFT: "badge-blue", CONFIRMED: "badge-green", DELIVERED: "badge-green", INVOICED: "badge-purple", CANCELLED: "badge-red" };
    return <span className={`badge ${map[status] || "badge-blue"}`}>{status}</span>;
  };
  return <main className="page">
    <PageHeading eyebrow="B2B" title="Sales Order" description="Kelola pesanan penjualan B2B dengan syarat pembayaran tertunda." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Buat Sales Order</button>} />
    <div className="page-card-grid">
      <div className="mini-stat"><span className="mini-stat-label">Total SO</span><p className="mini-stat-value">{orders.length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Draft</span><p className="mini-stat-value">{orders.filter((o) => o.status === "DRAFT").length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Total nilai</span><p className="mini-stat-value">{shortRupiah(orders.reduce((s, o) => s + o.total_amount, 0))}</p></div>
    </div>
    <section className="card table-wrap" style={{ marginTop: 18 }}>
      <table><thead><tr><th>Tanggal</th><th>Pelanggan</th><th>Termin</th><th>Total</th><th>Status</th><th></th></tr></thead>
      <tbody>{orders.map((so) => <tr key={so.id}>
        <td className="table-muted">{dateLabel(so.order_date)}</td>
        <td className="table-primary">{so.customer_name}</td>
        <td>NET {so.payment_terms_days}</td>
        <td className="table-primary">{rupiah(so.total_amount)}</td>
        <td>{statusBadge(so.status)}</td>
        <td>{so.status === "DRAFT" && <button className="button button-primary" style={{ minHeight: 34, padding: "0 11px", fontSize: 11 }} onClick={() => onConfirm(so.id)}>Konfirmasi</button>}</td>
      </tr>)}{!orders.length && <tr><td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 24 }}>Belum ada sales order.</td></tr>}</tbody></table>
    </section>
  </main>;
}
function B2BOrderModal({ customers, products, onClose, onSave }: { customers: Party[]; products: Product[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const [rows, setRows] = useState([0]);
  return <Modal large title="Buat Sales Order" description="Pilih pelanggan, tambahkan produk, dan atur termin pembayaran." onClose={onClose}>
    <form onSubmit={onSave}>
      <div className="form-grid">
        <div className="field full"><label>Pelanggan *</label><select className="select" name="customer" defaultValue=""><option value="" disabled>Pilih pelanggan</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label>Termin pembayaran</label><select className="select" name="paymentTerms"><option value={30}>NET 30</option><option value={60}>NET 60</option><option value={90}>NET 90</option></select></div>
        <div className="field"><label>Catatan</label><input className="input" name="notes" placeholder="Catatan SO" /></div>
      </div>
      <div className="section-header" style={{ marginTop: 18 }}><h2>Item pesanan</h2><button type="button" className="button button-secondary" onClick={() => setRows((c) => [...c, c.length])}><Plus size={15} />Tambah item</button></div>
      {rows.map((row, i) => <div className="form-grid" key={row} style={{ marginTop: 8 }}>
        <div className="field"><label>{i === 0 ? "Produk *" : `Produk ${i + 1}`}</label><select className="select" name="itemId" defaultValue=""><option value="" disabled>Pilih produk</option>{products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="field"><label>Qty *</label><input className="input" name="itemQty" type="number" min="1" step="0.01" placeholder="0" /></div>
        <div className="field"><label>Harga/unit *</label><input className="input" name="itemPrice" type="number" min="0" placeholder="0" /></div>
        {rows.length > 1 && <button type="button" className="button button-ghost" onClick={() => setRows((c) => c.filter((v) => v !== row))} style={{ alignSelf: "end" }}><Trash2 size={16} /></button>}
      </div>)}
      <ModalFooter onClose={onClose} submitLabel="Simpan Sales Order" />
    </form>
  </Modal>;
}
function B2BDeliveryView({ deliveries, orders, onAdd, onDeliver }: { deliveries: DeliveryOrder[]; orders: SalesOrder[]; onAdd: () => void; onDeliver: (doId: string, soId: string) => void }) {
  const confirmedOrders = orders.filter((so) => so.status === "CONFIRMED");
  return <main className="page">
    <PageHeading eyebrow="B2B" title="Surat Jalan" description="Buat dan kelola surat jalan untuk pengiriman pesanan B2B." action={<button className="button button-primary" onClick={onAdd} disabled={!confirmedOrders.length}><Plus size={17} />Buat Surat Jalan</button>} />
    <div className="page-card-grid">
      <div className="mini-stat"><span className="mini-stat-label">Total DO</span><p className="mini-stat-value">{deliveries.length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Pending</span><p className="mini-stat-value">{deliveries.filter((d) => d.status === "PENDING").length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Terkirim</span><p className="mini-stat-value">{deliveries.filter((d) => d.status === "DELIVERED").length}</p></div>
    </div>
    <section className="card table-wrap" style={{ marginTop: 18 }}>
      <table><thead><tr><th>Tanggal</th><th>Pelanggan</th><th>SO</th><th>Supir</th><th>Status</th><th></th></tr></thead>
      <tbody>{deliveries.map((d) => <tr key={d.id}>
        <td className="table-muted">{dateLabel(d.delivery_date)}</td>
        <td className="table-primary">{d.customer_name || "-"}</td>
        <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{d.sales_order_id.slice(0, 8)}</td>
        <td>{d.driver_name || <span className="table-muted">-</span>}</td>
        <td><span className={`badge ${d.status === "DELIVERED" ? "badge-green" : "badge-amber"}`}>{d.status === "DELIVERED" ? "Terkirim" : "Pending"}</span></td>
        <td>{d.status === "PENDING" && <button className="button button-primary" style={{ minHeight: 34, padding: "0 11px", fontSize: 11 }} onClick={() => onDeliver(d.id, d.sales_order_id)}>Konfirmasi Kirim</button>}</td>
      </tr>)}{!deliveries.length && <tr><td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 24 }}>Belum ada surat jalan.</td></tr>}</tbody></table>
    </section>
  </main>;
}
function B2BDeliveryModal({ orders, onClose, onSave }: { orders: SalesOrder[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Buat Surat Jalan" description="Pilih sales order yang sudah dikonfirmasi untuk dikirim." onClose={onClose}>
    <form onSubmit={onSave}>
      <div className="form-grid">
        <div className="field full"><label>Sales Order *</label><select className="select" name="salesOrderId" defaultValue=""><option value="" disabled>Pilih SO</option>{orders.map((so) => <option key={so.id} value={so.id}>{so.customer_name} — {rupiah(so.total_amount)} ({dateLabel(so.order_date)})</option>)}</select></div>
        <div className="field"><label>Nama supir</label><input className="input" name="driverName" placeholder="Nama supir" /></div>
        <div className="field"><label>Catatan</label><input className="input" name="notes" placeholder="Catatan pengiriman" /></div>
      </div>
      <ModalFooter onClose={onClose} submitLabel="Buat Surat Jalan" />
    </form>
  </Modal>;
}
function B2BInvoiceView({ invoices, orders, onAdd, onPay }: { invoices: Invoice[]; orders: SalesOrder[]; onAdd: () => void; onPay: (id: string) => void }) {
  const deliveredOrders = orders.filter((so) => so.status === "DELIVERED");
  const statusBadge = (status: Invoice["status"]) => {
    const map: Record<string, string> = { UNPAID: "badge-red", PARTIAL: "badge-amber", PAID: "badge-green", OVERDUE: "badge-red" };
    return <span className={`badge ${map[status] || "badge-red"}`}>{status === "PAID" ? "Lunas" : status === "PARTIAL" ? "Sebagian" : status === "OVERDUE" ? "Jatuh tempo" : "Belum bayar"}</span>;
  };
  const outstanding = invoices.reduce((s, inv) => s + Math.max(0, inv.total_amount - inv.paid_amount), 0);
  return <main className="page">
    <PageHeading eyebrow="B2B" title="Invoice" description="Buat invoice dari sales order dan catat pembayaran pelanggan." action={<button className="button button-primary" onClick={onAdd} disabled={!deliveredOrders.length}><Plus size={17} />Buat Invoice</button>} />
    <div className="page-card-grid">
      <div className="mini-stat"><span className="mini-stat-label">Total invoice</span><p className="mini-stat-value">{invoices.length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Outstanding</span><p className="mini-stat-value negative">{shortRupiah(outstanding)}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Lunas</span><p className="mini-stat-value">{invoices.filter((inv) => inv.status === "PAID").length}</p></div>
    </div>
    <section className="card table-wrap" style={{ marginTop: 18 }}>
      <table><thead><tr><th>No. Invoice</th><th>Pelanggan</th><th>Tanggal</th><th>Jatuh tempo</th><th>Total</th><th>Dibayar</th><th>Status</th><th></th></tr></thead>
      <tbody>{invoices.map((inv) => <tr key={inv.id}>
        <td className="table-primary" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{inv.invoice_number}</td>
        <td>{inv.customer_name || "-"}</td>
        <td className="table-muted">{dateLabel(inv.invoice_date)}</td>
        <td className={inv.status !== "PAID" ? "negative" : "table-muted"}>{dateLabel(inv.due_date)}</td>
        <td className="table-primary">{rupiah(inv.total_amount)}</td>
        <td>{rupiah(inv.paid_amount)}</td>
        <td>{statusBadge(inv.status)}</td>
        <td>{inv.status !== "PAID" && <button className="button button-primary" style={{ minHeight: 34, padding: "0 11px", fontSize: 11 }} onClick={() => onPay(inv.id)}>Bayar</button>}</td>
      </tr>)}{!invoices.length && <tr><td colSpan={8} className="table-muted" style={{ textAlign: "center", padding: 24 }}>Belum ada invoice.</td></tr>}</tbody></table>
    </section>
  </main>;
}
function B2BInvoiceModal({ orders, onClose, onSave }: { orders: SalesOrder[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Buat Invoice" description="Pilih sales order yang sudah dikirim untuk dibuatkan invoice." onClose={onClose}>
    <form onSubmit={onSave}>
      <div className="form-grid">
        <div className="field full"><label>Sales Order *</label><select className="select" name="salesOrderId" defaultValue=""><option value="" disabled>Pilih SO</option>{orders.map((so) => <option key={so.id} value={so.id}>{so.customer_name} — {rupiah(so.total_amount)} (NET {so.payment_terms_days})</option>)}</select></div>
      </div>
      <ModalFooter onClose={onClose} submitLabel="Buat Invoice" />
    </form>
  </Modal>;
}
function B2BAgingView({ aging }: { aging: AgingRow[] }) {
  const buckets = [
    { label: "0-30 hari", key: "0-30", color: "badge-blue" },
    { label: "31-60 hari", key: "31-60", color: "badge-amber" },
    { label: "61-90 hari", key: "61-90", color: "badge-red" },
    { label: ">90 hari", key: ">90", color: "badge-red" },
  ];
  const totalOutstanding = aging.reduce((s, r) => s + r.outstanding, 0);
  return <main className="page">
    <PageHeading eyebrow="B2B" title="Aging Piutang" description="Pantau piutang B2B berdasarkan umur tagihan." />
    <div className="page-card-grid">
      <div className="mini-stat"><span className="mini-stat-label">Total outstanding</span><p className="mini-stat-value negative">{rupiah(totalOutstanding)}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Invoice belum lunas</span><p className="mini-stat-value">{aging.length}</p></div>
    </div>
    <div className="kpi-grid" style={{ marginTop: 18 }}>
      {buckets.map((b) => {
        const bucketTotal = aging.filter((r) => r.age_bucket === b.key).reduce((s, r) => s + r.outstanding, 0);
        return <Kpi key={b.key} label={b.label} value={rupiah(bucketTotal)} foot={<span>{aging.filter((r) => r.age_bucket === b.key).length} invoice</span>} icon={<Clock3 size={16} />} />;
      })}
    </div>
    <section className="card table-wrap" style={{ marginTop: 18 }}>
      <table><thead><tr><th>Invoice</th><th>Pelanggan</th><th>Tanggal</th><th>Jatuh tempo</th><th>Total</th><th>Dibayar</th><th>Outstanding</th><th>Umur</th></tr></thead>
      <tbody>{aging.map((row) => <tr key={row.invoice_id}>
        <td className="table-primary" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{row.invoice_number}</td>
        <td>{row.customer_name}</td>
        <td className="table-muted">{dateLabel(row.invoice_date)}</td>
        <td className="negative">{dateLabel(row.due_date)}</td>
        <td>{rupiah(row.total_amount)}</td>
        <td>{rupiah(row.paid_amount)}</td>
        <td className="table-primary negative">{rupiah(row.outstanding)}</td>
        <td><span className={`badge ${row.days_overdue > 60 ? "badge-red" : row.days_overdue > 30 ? "badge-amber" : "badge-blue"}`}>{row.days_overdue} hari</span></td>
      </tr>)}{!aging.length && <tr><td colSpan={8} className="table-muted" style={{ textAlign: "center", padding: 24 }}>Tidak ada piutang outstanding.</td></tr>}</tbody></table>
    </section>
  </main>;
}
function GuideView({ role }: { role: "OWNER" | "KASIR" }) {
  const [tab, setTab] = useState<"panduan" | "studi" | "laporan">("panduan");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection((current) => (current === id ? null : id));

  return (
    <main className="page">
      <PageHeading eyebrow="Bantuan" title="Panduan DapurKasir" description={role === "KASIR" ? "Panduan lengkap untuk kasir." : "Panduan lengkap penggunaan aplikasi untuk owner dan kasir."} />
      <div className="category-row" style={{ marginBottom: 18 }}>
        <button className={`category-chip ${tab === "panduan" ? "active" : ""}`} onClick={() => setTab("panduan")}>Panduan</button>
        <button className={`category-chip ${tab === "studi" ? "active" : ""}`} onClick={() => setTab("studi")}>Studi Kasus</button>
        <button className={`category-chip ${tab === "laporan" ? "active" : ""}`} onClick={() => setTab("laporan")}>Laporan</button>
      </div>
      {tab === "panduan" ? <PanduanTab role={role} openSection={openSection} toggle={toggle} /> : tab === "studi" ? <StudiKasusTab openSection={openSection} toggle={toggle} /> : <LaporanTab openSection={openSection} toggle={toggle} />}
    </main>
  );
}

function Accordion({ id, title, icon, children, isOpen, toggle }: { id: string; title: string; icon: ReactNode; children: ReactNode; isOpen: boolean; toggle: (id: string) => void }) {
  return (
    <section className="card" style={{ marginBottom: 10 }}>
      <button onClick={() => toggle(id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "inherit", fontSize: "inherit" }}>
        {icon}
        <strong style={{ flex: 1, fontSize: 14 }}>{title}</strong>
        <ChevronRight size={16} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s", color: "var(--muted)" }} />
      </button>
      {isOpen && <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)", fontSize: 13, lineHeight: 1.7 }}>{children}</div>}
    </section>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: ReactNode }) {
  return <div style={{ display: "flex", gap: 10, marginTop: 10 }}><span className="badge badge-blue" style={{ minWidth: 22, textAlign: "center" }}>{num}</span><div><strong>{title}</strong><p style={{ margin: "2px 0 0", color: "var(--muted)" }}>{children}</p></div></div>;
}

function Tip({ children }: { children: ReactNode }) {
  return <div className="callout" style={{ marginTop: 10 }}><Sparkles size={15} /><div><strong>Tips</strong><p style={{ margin: 0 }}>{children}</p></div></div>;
}

function PanduanTab({ role, openSection, toggle }: { role: "OWNER" | "KASIR"; openSection: string | null; toggle: (id: string) => void }) {
  const ownerSections = (
    <>
      <Accordion id="dashboard" title="Dashboard" icon={<LayoutDashboard size={18} />} isOpen={openSection === "dashboard"} toggle={toggle}>
        <p>Dashboard menampilkan ringkasan bisnis Anda dalam satu layar.</p>
        <Step num={1} title="KPI Atas">Total penjualan, laba bersih, jumlah transaksi, dan piutang jatuh tempo ditampilkan dalam kartu di bagian atas.</Step>
        <Step num={2} title="Grafik Penjualan">Grafik mingguan membantu Anda melihat tren penjualan dari waktu ke waktu.</Step>
        <Step num={3} title="Aktivitas Terbaru">Penjualan, produksi, dan pembelian terakhir ditampilkan secara kronologis.</Step>
        <Tip>Periksa dashboard setiap pagi untuk memantau kondisi bisnis sebelum memulai operasional.</Tip>
      </Accordion>

      <Accordion id="products" title="Produk Jadi" icon={<Package size={18} />} isOpen={openSection === "products"} toggle={toggle}>
        <p>Kelola semua produk siap jual beserta harga dan stoknya.</p>
        <Step num={1} title="Tambah Produk">Klik tombol &quot;Tambah produk&quot;, isi nama, harga jual, stok awal, dan satuan.</Step>
        <Step num={2} title="Edit Produk">Klik nama produk untuk mengubah harga, stok, atau menonaktifkan produk.</Step>
        <Step num={3} title="Import Massal">Gunakan tombol &quot;Import&quot; untuk menambah banyak produk sekaligus via file CSV. Unduh template terlebih dahulu.</Step>
        <Step num={4} title="HPP (Harga Pokok Penjualan)">HPP diperbarui otomatis setiap kali Anda menjalankan produksi batch.</Step>
        <Tip>Satuan yang konsisten (pcs, kg, liter) membantu perhitungan stok tetap akurat.</Tip>
      </Accordion>

      <Accordion id="materials" title="Bahan Baku" icon={<Leaf size={18} />} isOpen={openSection === "materials"} toggle={toggle}>
        <p>Pantau stok dan harga beli bahan baku yang digunakan untuk produksi.</p>
        <Step num={1} title="Tambah Bahan">Isi nama bahan, satuan, stok awal, dan harga beli per unit.</Step>
        <Step num={2} title="Stok Otomatis">Stok berkurang saat produksi dan bertambah saat pembelian dicatat.</Step>
        <Step num={3} title="Import Massal">Sama seperti produk, Anda bisa import bahan baku via CSV.</Step>
        <Tip>Pantau stok bahan baku secara berkala untuk menghindari kehabisan saat produksi.</Tip>
      </Accordion>

      <Accordion id="production" title="Produksi Batch" icon={<Boxes size={18} />} isOpen={openSection === "production"} toggle={toggle}>
        <p>Ubah bahan baku menjadi produk jadi dengan perhitungan HPP yang akurat.</p>
        <Step num={1} title="Buat Batch">Klik &quot;Buat batch produksi&quot;, pilih produk output dan jumlah yang dihasilkan.</Step>
        <Step num={2} title="Pilih Bahan">Tambahkan satu atau lebih bahan baku beserta jumlah yang digunakan.</Step>
        <Step num={3} title="Multi-Output">Satu batch bisa menghasilkan beberapa produk kemasan berbeda. Klik &quot;Tambah kemasan&quot; untuk menambah varian output.</Step>
        <Step num={4} title="Biaya Lain">Tambahkan biaya tambahan seperti gas, kemasan, atau tenaga kerja jika diperlukan.</Step>
        <Step num={5} title="HPP Otomatis">Sistem menghitung HPP per unit dari total biaya dibagi total output. Stok bahan berkurang dan stok produk bertambah otomatis.</Step>
        <Tip>Contoh multi-output: Bahan A+B+C+D menghasilkan Chili Oil 250ml (4 pcs), 500ml (1 pc), dan 100ml (10 pcs).</Tip>
      </Accordion>

      <Accordion id="purchases" title="Pembelian" icon={<Truck size={18} />} isOpen={openSection === "purchases"} toggle={toggle}>
        <p>Catat pembelian bahan baku dari supplier.</p>
        <Step num={1} title="Catat Pembelian">Pilih supplier, pilih bahan, masukkan kuantitas dan harga beli.</Step>
        <Step num={2} title="Status Pembayaran">Pilih &quot;Lunas&quot; jika langsung bayar, atau &quot;Utang&quot; jika mencicil.</Step>
        <Step num={3} title="Stok Bertambah">Stok bahan baku bertambah otomatis setelah pembelian disimpan.</Step>
        <Step num={4} title="Bayar Utang (Cicil)">Klik tombol &quot;Bayar&quot; pada baris pembelian yang masih ada sisa utang. Isi nominal (maksimal sebesar sisa utang), pilih metode Tunai / Transfer / QRIS, unggah bukti bayar, lalu simpan. Sisa utang dan status berubah otomatis menjadi Sebagian atau Lunas.</Step>
        <Step num={5} title="Upload Bukti Bayar">Lampirkan foto atau PDF bukti transfer saat mencatat pembayaran. Format JPG, PNG, WebP, atau PDF, maksimal 5MB. Bukti tersimpan dan bisa dibuka lagi sebagai arsip.</Step>
        <Step num={6} title="Retur ke Supplier">Jika ada bahan rusak atau tidak sesuai, klik &quot;Retur ke supplier&quot;. Pilih pembelian asal, supplier, bahan, dan kuantitas retur, lalu isi alasannya. Stok bahan berkurang otomatis sesuai jumlah yang diretur.</Step>
        <Tip>Harga beli terakhir akan digunakan untuk menghitung HPP saat produksi. Nilai retur juga dihitung dari harga beli terakhir bahan tersebut.</Tip>
      </Accordion>

      <Accordion id="parties" title="Pelanggan & Supplier" icon={<Users size={18} />} isOpen={openSection === "parties"} toggle={toggle}>
        <p>Kelola data pelanggan dan supplier dalam satu tempat.</p>
        <Step num={1} title="Tambah Kontak">Isi nama dan tipe (Pelanggan atau Supplier).</Step>
        <Step num={2} title="Kaitkan dengan Transaksi">Pilih supplier saat pembelian, pelanggan saat penjualan dengan piutang.</Step>
        <Tip>Menjaga data kontak tetap rapi membantu pelacakan piutang dan utang.</Tip>
      </Accordion>

      <Accordion id="b2b-orders" title="B2B — Sales Order" icon={<FileText size={18} />} isOpen={openSection === "b2b-orders"} toggle={toggle}>
        <p>Modul B2B dipakai saat Anda menjual ke reseller, toko, kafe, atau restoran dengan alur pesanan resmi. Alurnya berurutan: <strong>Sales Order &rarr; Surat Jalan &rarr; Invoice &rarr; Aging Piutang</strong>.</p>
        <Step num={1} title="Buat Sales Order">Klik &quot;Buat sales order&quot;, pilih pelanggan, lalu tentukan termin pembayaran (default 30 hari). Termin ini yang nanti menentukan tanggal jatuh tempo invoice.</Step>
        <Step num={2} title="Tambah Item">Masukkan produk, kuantitas, dan harga jual per unit. Harga B2B boleh berbeda dari harga kasir. Tambahkan sebanyak yang dipesan.</Step>
        <Step num={3} title="Status Draft">Pesanan baru berstatus <strong>Draft</strong>. Pada tahap ini pesanan masih bisa dianggap belum final.</Step>
        <Step num={4} title="Konfirmasi Pesanan">Klik &quot;Konfirmasi&quot; untuk mengubah status menjadi <strong>Confirmed</strong>. Surat jalan hanya bisa dibuat dari sales order yang sudah dikonfirmasi.</Step>
        <Tip>Isi termin pembayaran sesuai kesepakatan dengan pelanggan. Termin 14 hari untuk pelanggan baru dan 30 hari untuk langganan lama adalah pola yang umum.</Tip>
      </Accordion>

      <Accordion id="b2b-deliveries" title="B2B — Surat Jalan" icon={<Truck size={18} />} isOpen={openSection === "b2b-deliveries"} toggle={toggle}>
        <p>Surat jalan adalah dokumen pengiriman barang ke pelanggan B2B.</p>
        <Step num={1} title="Pilih Sales Order">Klik &quot;Buat surat jalan&quot;, lalu pilih sales order. Hanya pesanan berstatus <strong>Confirmed</strong> yang muncul di daftar.</Step>
        <Step num={2} title="Isi Data Pengiriman">Masukkan nama driver dan catatan pengiriman jika ada. Item barang tersalin otomatis dari sales order.</Step>
        <Step num={3} title="Status Pending">Surat jalan yang baru dibuat berstatus <strong>Pending</strong>, artinya barang sedang dalam perjalanan.</Step>
        <Step num={4} title="Konfirmasi Terkirim">Setelah barang sampai dan diterima pelanggan, klik &quot;Konfirmasi kirim&quot;. Status surat jalan dan sales order sama-sama berubah menjadi <strong>Delivered</strong>.</Step>
        <Tip>Cetak surat jalan untuk dibawa driver dan ditandatangani pelanggan sebagai bukti serah terima barang.</Tip>
      </Accordion>

      <Accordion id="b2b-invoices" title="B2B — Invoice" icon={<Receipt size={18} />} isOpen={openSection === "b2b-invoices"} toggle={toggle}>
        <p>Invoice adalah tagihan resmi yang dikirim ke pelanggan setelah barang diterima.</p>
        <Step num={1} title="Buat Invoice">Klik &quot;Buat invoice&quot; dan pilih sales order. Hanya pesanan berstatus <strong>Delivered</strong> yang bisa ditagih, sehingga Anda tidak akan menagih barang yang belum terkirim.</Step>
        <Step num={2} title="Nomor & Jatuh Tempo Otomatis">Nomor invoice dan tanggal jatuh tempo dibuat otomatis oleh sistem. Jatuh tempo dihitung dari tanggal invoice ditambah termin pembayaran di sales order.</Step>
        <Step num={3} title="Status Tagihan">Invoice dimulai dari <strong>Belum bayar</strong>, lalu berubah menjadi <strong>Sebagian</strong> atau <strong>Lunas</strong> mengikuti pembayaran. Invoice yang lewat jatuh tempo ditandai <strong>Jatuh tempo</strong>.</Step>
        <Step num={4} title="Terima Pembayaran">Klik &quot;Bayar&quot;, isi nominal, pilih metode, unggah bukti transfer, lalu simpan. Sama seperti piutang, pembayaran boleh dicicil beberapa kali.</Step>
        <Tip>Kirim invoice ke pelanggan segera setelah barang diterima. Semakin cepat invoice terbit, semakin cepat pula pembayaran masuk.</Tip>
      </Accordion>

      <Accordion id="b2b-aging" title="B2B — Aging Piutang" icon={<Clock3 size={18} />} isOpen={openSection === "b2b-aging"} toggle={toggle}>
        <p>Aging piutang mengelompokkan invoice yang belum lunas berdasarkan <strong>umur tagihan</strong>, sehingga Anda tahu mana yang harus ditagih lebih dulu.</p>
        <Step num={1} title="Kelompok Umur">Tagihan dibagi menjadi empat kelompok: <strong>0&ndash;30 hari</strong>, <strong>31&ndash;60 hari</strong>, <strong>61&ndash;90 hari</strong>, dan <strong>di atas 90 hari</strong>.</Step>
        <Step num={2} title="Baca Warnanya">Kelompok 0&ndash;30 hari masih wajar. Kelompok 31&ndash;60 hari perlu diingatkan. Kelompok 61 hari ke atas ditandai merah dan harus segera ditindaklanjuti.</Step>
        <Step num={3} title="Total Outstanding">Angka di bagian atas menunjukkan total seluruh tagihan B2B yang belum tertagih beserta jumlah invoicenya.</Step>
        <Step num={4} title="Tindak Lanjut">Prioritaskan penagihan dari kelompok umur paling tua, karena semakin lama tagihan menganggur semakin besar risiko tidak tertagih.</Step>
        <Tip>Jika ada tagihan yang menembus 90 hari, pertimbangkan untuk menghentikan sementara pengiriman baru ke pelanggan tersebut sampai tagihan lama dilunasi.</Tip>
      </Accordion>

      <Accordion id="receivables" title="Piutang" icon={<WalletCards size={18} />} isOpen={openSection === "receivables"} toggle={toggle}>
        <p>Lacak penjualan yang belum dibayar lunas oleh pelanggan.</p>
        <Step num={1} title="Otomatis dari POS">Piutang tercipta otomatis saat Anda memilih metode &quot;Piutang&quot; di kasir.</Step>
        <Step num={2} title="Terima Pembayaran">Klik tombol &quot;Terima bayar&quot; pada baris piutang. Isi nominal yang dibayar pelanggan, pilih metode Tunai / Transfer / QRIS, lalu simpan.</Step>
        <Step num={3} title="Bayar Sebagian (Cicilan)">Nominal boleh lebih kecil dari sisa tagihan. Status otomatis menjadi &quot;Sebagian&quot; dan sisa tagihan ikut berkurang, sehingga pelanggan bisa mencicil beberapa kali.</Step>
        <Step num={4} title="Lampirkan Bukti Bayar">Unggah foto atau PDF bukti transfer dari pelanggan (JPG, PNG, WebP, atau PDF, maksimal 5MB) sebagai arsip jika terjadi selisih catatan di kemudian hari.</Step>
        <Step num={5} title="Jatuh Tempo">Sistem menandai piutang yang sudah jatuh tempo untuk memudahkan penagihan.</Step>
        <Tip>Pantau piutang jatuh tempo secara rutin untuk menjaga arus kas tetap sehat. Selalu minta bukti transfer sebelum menandai piutang lunas.</Tip>
      </Accordion>

      <Accordion id="expenses" title="Pengeluaran" icon={<CircleDollarSign size={18} />} isOpen={openSection === "expenses"} toggle={toggle}>
        <p>Catat semua biaya operasional dan prive pemilik.</p>
        <Step num={1} title="Beban Operasional">Biaya seperti sewa, listrik, gaji, transport, dan bahan habis pakai.</Step>
        <Step num={2} title="Prive / Tarik Modal">Pencatatan terpisah untuk uang yang diambil pemilik untuk keperluan pribadi.</Step>
        <Step num={3} title="Kategori">Gunakan kategori yang konsisten untuk memudahkan analisis di laporan.</Step>
        <Tip>Pisahkan antara beban operasional dan prive agar laporan laba rugi akurat.</Tip>
      </Accordion>

      <Accordion id="cash-recon" title="Rekonsiliasi Kas" icon={<ClipboardList size={18} />} isOpen={openSection === "cash-recon"} toggle={toggle}>
        <p>Rekonsiliasi kas adalah kegiatan mencocokkan <strong>uang fisik di laci</strong> dengan <strong>catatan kas di sistem</strong>. Lakukan setiap tutup toko untuk mendeteksi selisih sedini mungkin.</p>
        <Step num={1} title="Hitung Uang Fisik">Setelah tutup toko, hitung seluruh uang tunai yang ada di laci kasir.</Step>
        <Step num={2} title="Input Rekonsiliasi">Klik &quot;Input rekonsiliasi&quot;, isi tanggal, kas menurut sistem, dan kas fisik hasil hitungan manual.</Step>
        <Step num={3} title="Selisih Otomatis">Sistem menghitung selisih dengan rumus <strong>kas fisik &minus; kas sistem</strong>. Hasil nol berarti kas seimbang, positif berarti uang lebih, negatif berarti uang kurang.</Step>
        <Step num={4} title="Tulis Penyebabnya">Isi kolom catatan setiap kali ada selisih, misalnya &quot;uang bensin diambil dari laci&quot; atau &quot;kembalian kurang&quot;. Catatan ini yang menyelamatkan Anda saat menelusuri masalah bulan depan.</Step>
        <Step num={5} title="Status">Setiap rekonsiliasi berstatus <strong>Open</strong>, <strong>Verified</strong>, atau <strong>Disputed</strong>. Gunakan Disputed untuk selisih yang masih diselidiki.</Step>
        <Tip>Satu tanggal hanya menyimpan satu data rekonsiliasi. Jika Anda input ulang untuk tanggal yang sama, data lama akan digantikan.</Tip>
      </Accordion>

      <Accordion id="reports" title="Laporan" icon={<BarChart3 size={18} />} isOpen={openSection === "reports"} toggle={toggle}>
        <p>Tiga laporan keuangan utama untuk memantau kesehatan bisnis.</p>
        <Step num={1} title="Laba Rugi">Menampilkan omzet, HPP, beban operasional, dan laba bersih pada periode tertentu.</Step>
        <Step num={2} title="Arus Kas">Menampilkan pemasukan dan pengeluaran kas secara riil.</Step>
        <Step num={3} title="Neraca">Menampilkan posisi aset (kas, piutang, persediaan) dan kewajiban (utang).</Step>
        <Step num={4} title="Filter Periode">Gunakan filter tanggal untuk melihat laporan bulanan atau periode tertentu.</Step>
        <Step num={5} title="Export CSV">Unduh data laporan dalam format CSV untuk analisis lebih lanjut.</Step>
        <Tip>Periksa laporan laba rugi setiap akhir bulan untuk mengevaluasi kinerja bisnis.</Tip>
      </Accordion>

      <Accordion id="pos" title="Kasir POS" icon={<ShoppingCart size={18} />} isOpen={openSection === "pos"} toggle={toggle}>
        <p>Halaman kasir untuk memproses penjualan secara langsung.</p>
        <Step num={1} title="Cari Produk">Gunakan kolom pencarian atau filter kategori untuk menemukan produk.</Step>
        <Step num={2} title="Tambah ke Keranjang">Tap produk untuk menambahkan ke keranjang. Atur jumlah dengan tombol +/-.</Step>
        <Step num={3} title="Bayar">Klik &quot;Bayar sekarang&quot;, pilih metode pembayaran (Tunai, Transfer, QRIS, atau Piutang).</Step>
        <Step num={4} title="Struk">Setelah pembayaran berhasil, struk dapat dicetak atau dikirim via WhatsApp.</Step>
        <Tip>Stok produk berkurang otomatis setelah transaksi berhasil.</Tip>
      </Accordion>

      <Accordion id="settings" title="Pengaturan" icon={<Settings size={18} />} isOpen={openSection === "settings"} toggle={toggle}>
        <p>Kelola profil bisnis, kasir, dan pengaturan akun.</p>
        <Step num={1} title="Profil Bisnis">Ubah nama usaha dan informasi dasar bisnis.</Step>
        <Step num={2} title="Kelola Kasir">Tambah atau kelola akun kasir dengan PIN 6 digit.</Step>
        <Step num={3} title="Mode Gelap">Aktifkan mode gelap untuk kenyamanan mata.</Step>
        <Tip>Kasir hanya bisa mengakses halaman POS dan ringkasan. Semua fitur lain hanya untuk owner.</Tip>
      </Accordion>
    </>
  );

  const kasirSections = (
    <>
      <Accordion id="kasir-login" title="Login Kasir" icon={<UserRound size={18} />} isOpen={openSection === "kasir-login"} toggle={toggle}>
        <p>Setiap kasir memiliki akun terpisah dengan PIN 6 digit.</p>
        <Step num={1} title="Buka Halaman Kasir">Akses halaman kasir dari link yang diberikan owner.</Step>
        <Step num={2} title="Masukkan PIN">Masukkan PIN 6 digit yang telah didaftarkan owner.</Step>
        <Step num={3} title="Mulai Berjualan">Setelah login, Anda akan diarahkan ke halaman POS.</Step>
        <Tip>Jangan bagikan PIN Anda kepada orang lain. Hubungi owner jika lupa PIN.</Tip>
      </Accordion>

      <Accordion id="kasir-pos" title="Cara Berjualan" icon={<ShoppingCart size={18} />} isOpen={openSection === "kasir-pos"} toggle={toggle}>
        <p>Proses penjualan dari awal hingga cetak struk.</p>
        <Step num={1} title="Cari Produk">Gunakan kolom pencarian di bagian atas untuk menemukan produk. Anda juga bisa filter berdasarkan kategori.</Step>
        <Step num={2} title="Tambah ke Keranjang">Tap kartu produk untuk menambahkan ke keranjang. Jumlah default adalah 1.</Step>
        <Step num={3} title="Atur Jumlah">Gunakan tombol + dan - di keranjang untuk mengubah jumlah pesanan.</Step>
        <Step num={4} title="Hapus Item">Kurangi jumlah ke 0 untuk menghapus item dari keranjang.</Step>
        <Step num={5} title="Proses Pembayaran">Klik &quot;Bayar sekarang&quot;. Pilih metode: Tunai, Transfer, atau QRIS.</Step>
        <Step num={6} title="Cetak Struk">Setelah pembayaran berhasil, klik ikon printer untuk mencetak struk.</Step>
        <Tip>Periksa kembali pesanan sebelum memproses pembayaran. Transaksi yang sudah dibatalkan tidak dapat dihapus.</Tip>
      </Accordion>

      <Accordion id="kasir-tips" title="Tips untuk Kasir" icon={<Sparkles size={18} />} isOpen={openSection === "kasir-tips"} toggle={toggle}>
        <p>Beberapa tips untuk kelancaran operasional kasir.</p>
        <div style={{ marginTop: 8 }}><strong>Sebelum shift:</strong><ul style={{ margin: "4px 0 0 18px" }}><li>Pastikan perangkat terhubung ke internet.</li><li>Periksa stok produk yang akan dijual hari ini.</li><li>Hubungi owner jika ada produk yang stoknya habis.</li></ul></div>
        <div style={{ marginTop: 8 }}><strong>Selama shift:</strong><ul style={{ margin: "4px 0 0 18px" }}><li>Gunakan pencarian untuk mempercepat transaksi.</li><li>Konfirmasi jumlah dan total sebelum memproses pembayaran.</li><li>Cetak struk untuk setiap transaksi sebagai bukti.</li></ul></div>
        <div style={{ marginTop: 8 }}><strong>Akhir shift:</strong><ul style={{ margin: "4px 0 0 18px" }}><li>Hitung seluruh uang tunai di laci sebelum tutup.</li><li>Serahkan hasil hitungan ke owner untuk dicocokkan dengan catatan sistem (rekonsiliasi kas).</li><li>Laporkan setiap pengeluaran kecil yang diambil dari laci, seperti bensin atau galon, agar tidak muncul sebagai selisih kas.</li><li>Logout dari akun kasir Anda.</li><li>Laporkan kendala yang dialami selama shift kepada owner.</li></ul></div>
      </Accordion>
    </>
  );

  return <div>{role === "KASIR" ? kasirSections : ownerSections}</div>;
}

function StudiKasusTab({ openSection, toggle }: { openSection: string | null; toggle: (id: string) => void }) {
  return (
    <div>
      <Accordion id="case-warung" title="Studi Kasus 1: Warung Makan Sederhana" icon={<Store size={18} />} isOpen={openSection === "case-warung"} toggle={toggle}>
        <p><strong>Latar Belakang:</strong> Pak Budi memiliki warung makan sederhana. Setiap hari ia membeli bahan baku (beras, ayam, sayuran, minyak) dan memasaknya menjadi menu siap saji.</p>
        <div style={{ marginTop: 12 }}><strong>Langkah Implementasi:</strong></div>
        <Step num={1} title="Daftar dan Buat Akun">Buka aplikasi, daftar dengan email usaha, dan masukkan nama warung.</Step>
        <Step num={2} title="Tambah Bahan Baku">Buka menu Bahan Baku, tambahkan: Beras (kg), Ayam (kg), Sayuran (kg), Minyak (liter).</Step>
        <Step num={3} title="Tambah Produk Jadi">Buka menu Produk Jadi, tambahkan: Nasi Ayam (pcs), Nasi Sayur (pcs), Es Teh (gelas).</Step>
        <Step num={4} title="Catat Pembelian">Setiap pagi, buka menu Pembelian, catat bahan yang dibeli beserta harga dan jumlahnya.</Step>
        <Step num={5} title="Produksi Batch">Sebelum jam makan siang, buka Produksi Batch. Pilih output Nasi Ayam qty 50, masukkan bahan yang digunakan.</Step>
        <Step num={6} title="Jual di Kasir">Buka halaman Kasir POS, tap produk yang dipesan pelanggan, lalu proses pembayaran.</Step>
        <Step num={7} title="Pantau Laporan">Di akhir hari, buka Laporan untuk melihat laba rugi hari ini.</Step>
        <Tip>Untuk warung sederhana, Anda bisa langsung menjual tanpa produksi batch jika tidak ingin melacak HPP secara detail.</Tip>
      </Accordion>

      <Accordion id="case-sambal" title="Studi Kasus 2: Usaha Sambal Olahan (Multi-Output)" icon={<Package size={18} />} isOpen={openSection === "case-sambal"} toggle={toggle}>
        <p><strong>Latar Belakang:</strong> Mbak Rina memproduksi sambal olahan dalam berbagai kemasan. Dari satu batch produksi, ia menghasilkan sambal dalam kemasan 100ml, 250ml, dan 500ml.</p>
        <div style={{ marginTop: 12 }}><strong>Langkah Implementasi:</strong></div>
        <Step num={1} title="Siapkan Bahan Baku">Tambahkan di menu Bahan Baku: Cabai (kg), Bawang (kg), Gula (kg), Minyak (liter), Cuka (liter).</Step>
        <Step num={2} title="Siapkan Produk Jadi">Tambahkan di menu Produk Jadi: Sambal 100ml, Sambal 250ml, Sambal 500ml. Setiap kemasan adalah produk terpisah.</Step>
        <Step num={3} title="Beli Bahan">Catat pembelian bahan baku dari supplier di menu Pembelian.</Step>
        <Step num={4} title="Produksi Multi-Output">Buka Produksi Batch, klik Tambah kemasan untuk setiap varian. Isi: Sambal 100ml (10 pcs), Sambal 250ml (4 pcs), Sambal 500ml (1 pc). Tambahkan semua bahan yang digunakan.</Step>
        <Step num={5} title="HPP Terhitung">Sistem menghitung HPP dari total biaya bahan dibagi total seluruh unit output (10+4+1 = 15 unit).</Step>
        <Step num={6} title="Jual Beragam Saluran">Jual langsung di kasir, atau catat sebagai piutang jika menjual ke reseller atau toko.</Step>
        <Step num={7} title="Pantau Stok">Setiap kemasan memiliki stok terpisah. Pantau di menu Produk Jadi untuk tahu kapan harus produksi lagi.</Step>
        <Tip>Pastikan setiap kemasan (100ml, 250ml, 500ml) dibuat sebagai produk terpisah karena memiliki harga jual dan stok yang berbeda.</Tip>
      </Accordion>

      <Accordion id="case-kopi" title="Studi Kasus 3: Kedai Kopi" icon={<ShoppingBag size={18} />} isOpen={openSection === "case-kopi"} toggle={toggle}>
        <p><strong>Latar Belakang:</strong> Mas Andi membuka kedai kopi. Ia membeli kopi bubuk, susu, gula, dan cup, lalu meraciknya menjadi minuman siap saji.</p>
        <div style={{ marginTop: 12 }}><strong>Langkah Implementasi:</strong></div>
        <Step num={1} title="Bahan Baku">Tambahkan: Kopi Bubuk (kg), Susu (liter), Gula (kg), Cup 16oz (pcs), Cup 12oz (pcs), Es Batu (kg).</Step>
        <Step num={2} title="Produk Jadi">Tambahkan: Kopi Susu 16oz, Kopi Susu 12oz, Americano, Es Teh.</Step>
        <Step num={3} title="Pembelian Rutin">Catat pembelian bahan setiap minggu. Harga beli terakhir akan otomatis tercatat.</Step>
        <Step num={4} title="Produksi Harian">Setiap pagi, buat batch produksi untuk stok hari ini. Misal: 30 cup Kopi Susu 16oz, 20 cup Kopi Susu 12oz.</Step>
        <Step num={5} title="POS Cepat">Di jam sibuk, gunakan kolom pencarian di kasir untuk mempercepat transaksi. Tap produk, bayar, struk.</Step>
        <Step num={6} title="Catat Pengeluaran">Catat biaya operasional seperti sewa, listrik, dan gaji karyawan di menu Pengeluaran.</Step>
        <Step num={7} title="Evaluasi Bulanan">Buka Laporan Laba Rugi setiap akhir bulan untuk mengevaluasi margin keuntungan.</Step>
        <Tip>Untuk kedai kopi dengan menu sederhana, Anda bisa menjual langsung tanpa produksi batch dan mencatat HPP secara manual.</Tip>
      </Accordion>

      <Accordion id="case-toko" title="Studi Kasus 4: Toko Kelontong" icon={<Store size={18} />} isOpen={openSection === "case-toko"} toggle={toggle}>
        <p><strong>Latar Belakang:</strong> Ibu Sari memiliki toko kelontong yang menjual berbagai kebutuhan sehari-hari. Tidak ada proses produksi, hanya beli jual.</p>
        <div style={{ marginTop: 12 }}><strong>Langkah Implementasi:</strong></div>
        <Step num={1} title="Setup Produk">Tambahkan semua produk di menu Produk Jadi: Minyak Goreng (liter), Gula (kg), Telur (butir), Sabun (pcs), dan lainnya.</Step>
        <Step num={2} title="Import Massal">Jika produk banyak, gunakan fitur Import CSV untuk menambah ratusan produk sekaligus.</Step>
        <Step num={3} title="Catat Stok Awal">Masukkan stok awal setiap produk saat pertama kali mendaftar.</Step>
        <Step num={4} title="Pembelian dari Distributor">Setiap kali menerima kiriman barang, catat di menu Pembelian dengan nama supplier dan detail barang.</Step>
        <Step num={5} title="Jual di Kasir">Setiap pelanggan datang, buka kasir, tap produk, dan proses pembayaran.</Step>
        <Step num={6} title="Kelola Piutang">Jika ada pelanggan yang berhutang, pilih metode Piutang saat pembayaran. Catat pelunasan di menu Piutang.</Step>
        <Step num={7} title="Monitoring Stok">Pantau stok secara berkala. Sistem akan menandai stok rendah dengan badge kuning.</Step>
        <Tip>Toko kelontong tidak memerlukan fitur produksi. Fokus pada pencatatan pembelian dan penjualan yang konsisten.</Tip>
      </Accordion>

      <Accordion id="case-grosir" title="Studi Kasus 5: Usaha Grosir dengan Piutang" icon={<Truck size={18} />} isOpen={openSection === "case-grosir"} toggle={toggle}>
        <p><strong>Latar Belakang:</strong> Pak Hendri memiliki usaha grosir yang menjual ke warung-warung. Sebagian besar transaksi adalah piutang dengan jatuh tempo 30 hari.</p>
        <div style={{ marginTop: 12 }}><strong>Langkah Implementasi:</strong></div>
        <Step num={1} title="Daftar Pelanggan">Tambahkan semua warung langganan di menu Pelanggan dan Supplier.</Step>
        <Step num={2} title="Proses Penjualan">Saat warung memesan, buka kasir, pilih produk, lalu pilih metode Piutang saat pembayaran.</Step>
        <Step num={3} title="Pantau Piutang">Buka menu Piutang untuk melihat daftar piutang dan tanggal jatuh tempo.</Step>
        <Step num={4} title="Catat Pembayaran">Saat warung membayar, klik piutang yang bersangkutan dan masukkan nominal pembayaran.</Step>
        <Step num={5} title="Tagih Piutang Jatuh Tempo">Sistem menandai piutang yang sudah jatuh tempo. Gunakan fitur kirim WA untuk mengingatkan pelanggan.</Step>
        <Step num={6} title="Laporan Keuangan">Pantau total piutang di laporan neraca untuk memastikan arus kas tetap sehat.</Step>
        <Tip>Jaga rasio piutang terhadap omzet tetap sehat. Jika piutang terlalu besar, pertimbangkan untuk memperketat kebijakan kredit.</Tip>
      </Accordion>

      <Accordion id="case-b2b" title="Studi Kasus 6: Supplier F&amp;B ke Kafe dan Restoran (B2B)" icon={<BriefcaseBusiness size={18} />} isOpen={openSection === "case-b2b"} toggle={toggle}>
        <p><strong>Latar Belakang:</strong> Bu Maya memproduksi frozen food dan memasoknya ke kafe serta restoran. Pelanggannya memesan lewat WhatsApp, minta barang dikirim dulu, dan membayar 30 hari kemudian. Ia butuh dokumen resmi di setiap tahap.</p>
        <div style={{ marginTop: 12 }}><strong>Langkah Implementasi:</strong></div>
        <Step num={1} title="Daftarkan Pelanggan B2B">Tambahkan setiap kafe dan restoran di menu Pelanggan &amp; Supplier sebagai tipe Pelanggan, lengkap dengan nomor WhatsApp dan alamat pengiriman.</Step>
        <Step num={2} title="Buat Sales Order">Saat pesanan masuk, buka B2B &rarr; Sales Order. Pilih pelanggan, set termin 30 hari, masukkan produk dan harga khusus B2B. Lalu klik Konfirmasi.</Step>
        <Step num={3} title="Siapkan Barang">Jika stok belum cukup, jalankan Produksi Batch dulu supaya stok produk jadi mencukupi pesanan.</Step>
        <Step num={4} title="Buat Surat Jalan">Buka B2B &rarr; Surat Jalan, pilih sales order tadi, isi nama driver. Cetak surat jalan untuk dibawa dan ditandatangani penerima.</Step>
        <Step num={5} title="Konfirmasi Pengiriman">Setelah driver kembali dan barang diterima, klik &quot;Konfirmasi kirim&quot;. Status pesanan berubah menjadi Delivered.</Step>
        <Step num={6} title="Terbitkan Invoice">Buka B2B &rarr; Invoice, pilih sales order yang sudah Delivered. Nomor invoice dan jatuh tempo (30 hari) dibuat otomatis. Kirim invoice ke pelanggan.</Step>
        <Step num={7} title="Terima Pembayaran Bertahap">Kafe membayar 50% dulu. Klik &quot;Bayar&quot; pada invoice, isi nominal separuh, pilih Transfer, unggah bukti transfer. Status menjadi Sebagian. Ulangi saat pelunasan.</Step>
        <Step num={8} title="Pantau Aging">Buka B2B &rarr; Aging Piutang setiap awal minggu. Tagih lebih dulu pelanggan yang masuk kelompok 31&ndash;60 hari ke atas.</Step>
        <Tip>Bedakan penjualan B2B dari penjualan kasir. Transaksi eceran tetap lewat POS, sedangkan pesanan besar yang butuh surat jalan dan invoice resmi selalu lewat modul B2B.</Tip>
      </Accordion>

      <Accordion id="case-kontrol" title="Studi Kasus 7: Kontrol Kas Harian dan Retur Supplier" icon={<ClipboardList size={18} />} isOpen={openSection === "case-kontrol"} toggle={toggle}>
        <p><strong>Latar Belakang:</strong> Pak Doni punya dua kasir bergantian shift. Uang di laci sering tidak cocok dengan catatan, dan beberapa kali ia menerima bahan baku busuk dari supplier tanpa tahu cara mencatatnya.</p>
        <div style={{ marginTop: 12 }}><strong>Langkah Implementasi:</strong></div>
        <Step num={1} title="Rekonsiliasi Setiap Tutup Toko">Setiap malam, hitung uang fisik di laci lalu input di menu Rekonsiliasi Kas bersama angka kas menurut sistem.</Step>
        <Step num={2} title="Telusuri Selisih">Jika selisih negatif, periksa apakah ada pengeluaran kecil yang belum dicatat, kembalian yang salah, atau transaksi yang lupa diinput di kasir.</Step>
        <Step num={3} title="Catat Penyebabnya">Tulis penyebab selisih di kolom catatan dan tandai statusnya Disputed jika belum ketemu penyebabnya.</Step>
        <Step num={4} title="Catat Pengeluaran Kecil">Biasakan mencatat pengeluaran kecil dari laci (bensin, parkir, galon) di menu Pengeluaran supaya kas sistem selalu mencerminkan kondisi riil.</Step>
        <Step num={5} title="Retur Bahan Rusak">Saat menerima bahan busuk, buka menu Pembelian, klik &quot;Retur ke supplier&quot;, pilih pembelian asal dan bahan yang diretur, isi kuantitas dan alasannya.</Step>
        <Step num={6} title="Stok Ikut Menyesuaikan">Stok bahan berkurang otomatis sesuai jumlah retur, sehingga HPP produksi berikutnya tidak ikut menghitung bahan yang sebenarnya sudah dikembalikan.</Step>
        <Step num={7} title="Bayar Utang dengan Bukti">Saat melunasi utang supplier, selalu unggah bukti transfer di form pembayaran agar ada arsip jika supplier mengklaim belum menerima uang.</Step>
        <Tip>Selisih kas kecil yang dibiarkan setiap hari akan menumpuk jadi angka besar di akhir bulan. Rekonsiliasi harian jauh lebih murah daripada audit bulanan.</Tip>
      </Accordion>
    </div>
  );
}

function LaporanTab({ openSection, toggle }: { openSection: string | null; toggle: (id: string) => void }) {
  return (
    <div>
      <Accordion id="lap-pnl" title="Laporan Laba Rugi (P&L)" icon={<TrendingUp size={18} />} isOpen={openSection === "lap-pnl"} toggle={toggle}>
        <p>Laporan Laba Rugi menampilkan <strong>pendapatan, biaya, dan laba bersih</strong> pada periode tertentu. Gunakan laporan ini untuk mengevaluasi apakah usaha Anda menguntungkan.</p>
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface)", borderRadius: 10, fontSize: 13 }}>
          <strong>Rumus:</strong><br />
          Omzet &minus; HPP = <strong>Laba Kotor</strong><br />
          Laba Kotor &minus; Beban Operasional = <strong>Laba Bersih</strong>
        </div>
        <div style={{ marginTop: 12 }}><strong>Contoh perhitungan:</strong></div>
        <div className="activity-list" style={{ marginTop: 8 }}>
          <div className="activity-row"><span className="row-main">Omzet (15 transaksi)</span><span className="row-side">{rupiah(4820000)}</span></div>
          <div className="activity-row"><span className="row-main">HPP / COGS</span><span className="row-side negative">({rupiah(2265400)})</span></div>
          <div className="activity-row" style={{ fontWeight: 600 }}><span className="row-main">Laba Kotor</span><span className="row-side"><span className="badge badge-blue">{rupiah(2554600)}</span> <span style={{ color: "var(--muted)", fontSize: 11 }}>margin 53%</span></span></div>
          <div className="activity-row"><span className="row-main">Beban Operasional</span><span className="row-side negative">({rupiah(490000)})</span></div>
          <div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}><span className="row-main">Laba Bersih</span><span className="row-side"><span className="badge badge-green">{rupiah(2064600)}</span></span></div>
        </div>
        <Tip>Margin laba kotor di atas 50% menandakan harga jual sudah cukup sehat. Jika margin di bawah 30%, pertimbangkan untuk menaikkan harga atau menekan HPP.</Tip>
      </Accordion>

      <Accordion id="lap-cash" title="Laporan Arus Kas" icon={<CircleDollarSign size={18} />} isOpen={openSection === "lap-cash"} toggle={toggle}>
        <p>Laporan Arus Kas menampilkan <strong>aliran uang masuk dan keluar</strong> secara riil. Berbeda dengan laba rugi, arus kas mencakup modal dan prive sehingga menunjukkan posisi kas yang sebenarnya.</p>
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface)", borderRadius: 10, fontSize: 13 }}>
          <strong>Rumus:</strong><br />
          Kas Awal + Masuk &minus; Keluar = <strong>Kas Akhir</strong>
        </div>
        <div style={{ marginTop: 12 }}><strong>Contoh perhitungan:</strong></div>
        <div className="activity-list" style={{ marginTop: 8 }}>
          <div className="activity-row"><span className="row-main">Kas Awal (modal)</span><span className="row-side">{rupiah(15000000)}</span></div>
          <div className="activity-row"><span className="row-main">Masuk (penjualan)</span><span className="row-side"><span className="badge badge-green">+{rupiah(4820000)}</span></span></div>
          <div className="activity-row"><span className="row-main">Keluar (pembelian + beban)</span><span className="row-side negative">({rupiah(2755400)})</span></div>
          <div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}><span className="row-main">Kas Akhir</span><span className="row-side"><span className="badge badge-blue">{rupiah(17064600)}</span></span></div>
        </div>
        <Tip>Jika kas akhir lebih kecil dari kas awal padahal laba rugi positif, kemungkinan besar ada piutang yang belum tertagih atau prive yang besar.</Tip>
      </Accordion>

      <Accordion id="lap-neraca" title="Laporan Neraca (Balance Sheet)" icon={<BarChart3 size={18} />} isOpen={openSection === "lap-neraca"} toggle={toggle}>
        <p>Laporan Neraca menampilkan <strong>posisi keuangan</strong> pada satu titik waktu: aset (harta), kewajiban (utang), dan ekuitas (modal pemilik). Rumus dasar: <strong>Aset = Kewajiban + Ekuitas</strong>.</p>
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface)", borderRadius: 10, fontSize: 13 }}>
          <strong>Rumus:</strong><br />
          Aset = Kewajiban + Ekuitas<br />
          (harus selalu seimbang / balance)
        </div>
        <div style={{ marginTop: 12 }}><strong>Contoh perhitungan:</strong></div>
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>Aset:</div>
        <div className="activity-list" style={{ marginTop: 4 }}>
          <div className="activity-row"><span className="row-main">Kas</span><span className="row-side">{rupiah(17064600)}</span></div>
          <div className="activity-row"><span className="row-main">Piutang Usaha</span><span className="row-side">{rupiah(735000)}</span></div>
          <div className="activity-row"><span className="row-main">Persediaan</span><span className="row-side">{rupiah(8500000)}</span></div>
          <div className="activity-row" style={{ fontWeight: 700 }}><span className="row-main">Total Aset</span><span className="row-side"><span className="badge badge-blue">{rupiah(26299600)}</span></span></div>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>Kewajiban:</div>
        <div className="activity-list" style={{ marginTop: 4 }}>
          <div className="activity-row"><span className="row-main">Utang Usaha</span><span className="row-side">{rupiah(500000)}</span></div>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>Ekuitas:</div>
        <div className="activity-list" style={{ marginTop: 4 }}>
          <div className="activity-row"><span className="row-main">Modal</span><span className="row-side">{rupiah(15000000)}</span></div>
          <div className="activity-row"><span className="row-main">Laba Ditahan</span><span className="row-side">{rupiah(10799600)}</span></div>
          <div className="activity-row" style={{ fontWeight: 700 }}><span className="row-main">Total K + E</span><span className="row-side"><span className="badge badge-green">{rupiah(26299600)}</span></span></div>
        </div>
        <Tip>Pastikan Total Aset selalu sama dengan Total Kewajiban + Ekuitas. Jika tidak seimbang, periksa apakah ada transaksi yang belum tercatat.</Tip>
      </Accordion>

      <Accordion id="lap-aging" title="Laporan Aging Piutang" icon={<Clock3 size={18} />} isOpen={openSection === "lap-aging"} toggle={toggle}>
        <p>Aging piutang memecah tagihan yang belum lunas berdasarkan <strong>berapa lama tagihan itu menganggur</strong>. Neraca hanya memberi tahu total piutang, sedangkan aging memberi tahu seberapa berbahaya piutang tersebut.</p>
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface)", borderRadius: 10, fontSize: 13 }}>
          <strong>Rumus:</strong><br />
          Umur tagihan = Hari ini &minus; Tanggal jatuh tempo invoice
        </div>
        <div style={{ marginTop: 12 }}><strong>Contoh pembacaan:</strong></div>
        <div className="activity-list" style={{ marginTop: 8 }}>
          <div className="activity-row"><span className="row-main">0&ndash;30 hari <span style={{ color: "var(--muted)", fontSize: 11 }}>· wajar</span></span><span className="row-side"><span className="badge badge-blue">{rupiah(4200000)}</span></span></div>
          <div className="activity-row"><span className="row-main">31&ndash;60 hari <span style={{ color: "var(--muted)", fontSize: 11 }}>· ingatkan</span></span><span className="row-side"><span className="badge badge-amber">{rupiah(1850000)}</span></span></div>
          <div className="activity-row"><span className="row-main">61&ndash;90 hari <span style={{ color: "var(--muted)", fontSize: 11 }}>· tagih serius</span></span><span className="row-side"><span className="badge badge-red">{rupiah(920000)}</span></span></div>
          <div className="activity-row"><span className="row-main">&gt;90 hari <span style={{ color: "var(--muted)", fontSize: 11 }}>· berisiko macet</span></span><span className="row-side"><span className="badge badge-red">{rupiah(430000)}</span></span></div>
          <div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}><span className="row-main">Total Outstanding</span><span className="row-side negative">{rupiah(7400000)}</span></div>
        </div>
        <Tip>Pada contoh di atas, {rupiah(1350000)} atau sekitar 18% dari total piutang sudah lewat 60 hari. Jika porsi di atas 60 hari melebihi 20%, kebijakan kredit Anda perlu diperketat.</Tip>
      </Accordion>
    </div>
  );
}
function SupplierReturnModal({ purchases, materials, suppliers, onClose, onSave }: { purchases: Purchase[]; materials: Material[]; suppliers: Party[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Retur ke supplier" description="Kurangi stok bahan yang dikembalikan ke supplier." onClose={onClose}>
    <form onSubmit={onSave}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="return-purchase">Pembelian *</label><select className="select" id="return-purchase" name="purchase" defaultValue=""><option value="" disabled>Pilih pembelian</option>{purchases.map((item) => <option key={item.id} value={item.id}>{item.supplier} · {rupiah(item.total)}</option>)}</select></div>
        <div className="field full"><label htmlFor="return-supplier">Supplier *</label><select className="select" id="return-supplier" name="supplier" defaultValue=""><option value="" disabled>Pilih supplier</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field full"><label htmlFor="return-material">Bahan baku *</label><select className="select" id="return-material" name="material" defaultValue=""><option value="" disabled>Pilih bahan</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></div>
        <div className="field"><label htmlFor="return-qty">Kuantitas retur *</label><input className="input" id="return-qty" name="qty" type="number" min="0.01" step="0.01" /></div>
        <div className="field"><label htmlFor="return-reason">Alasan</label><input className="input" id="return-reason" name="reason" placeholder="Contoh: Barang rusak" /></div>
        <div className="field full"><label htmlFor="return-notes">Catatan</label><textarea className="textarea" id="return-notes" name="notes" /></div>
      </div>
      <ModalFooter onClose={onClose} submitLabel="Simpan retur" />
    </form>
  </Modal>;
}

function CashReconView({ recons, onAdd }: { recons: CashRecon[]; onAdd: () => void }) {
  return <main className="page">
    <PageHeading eyebrow="Keuangan" title="Rekonsiliasi kas harian" description="Bandingkan kas fisik aktual dengan catatan sistem untuk kontrol keuangan harian." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Input rekonsiliasi</button>} />
    <div className="page-card-grid">
      <div className="mini-stat"><span className="mini-stat-label">Rekonsiliasi bulan ini</span><p className="mini-stat-value">{recons.length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Selisih terbesar</span><p className="mini-stat-value">{recons.length ? shortRupiah(Math.max(...recons.map((r) => Math.abs(r.difference)))) : "Rp 0"}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Frekuensi</span><p className="mini-stat-value">{recons.length}x</p></div>
    </div>
    <section className="card table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Tanggal</th><th>Kas sistem</th><th>Kas fisik</th><th className="text-right">Selisih</th><th>Status</th><th>Catatan</th></tr></thead><tbody>{recons.map((item) => <tr key={item.id}><td className="table-muted">{dateLabel(item.date)}</td><td>{rupiah(item.systemCash)}</td><td>{rupiah(item.physicalCash)}</td><td className={`text-right ${item.difference !== 0 ? "negative" : "positive"}`}>{item.difference > 0 ? "+" : ""}{rupiah(item.difference)}</td><td><span className={`badge ${item.status === "verified" ? "badge-green" : item.status === "disputed" ? "badge-amber" : "badge-blue"}`}>{item.status === "open" ? "Open" : item.status === "verified" ? "Verified" : "Disputed"}</span></td><td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.notes || "-"}</td></tr>)}{!recons.length && <tr><td colSpan={6} className="table-muted" style={{ textAlign: "center" }}>Belum ada data rekonsiliasi.</td></tr>}</tbody></table></section>
  </main>;
}

function PartialPaymentModal({ target, onClose, onSave }: { target: PartialPaymentTarget; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const label = target.kind === "payable" ? "Bayar utang supplier" : target.kind === "receivable" ? "Terima pembayaran piutang" : "Terima pembayaran invoice";
  return <Modal title={label} description={`${target.title} — sisa ${rupiah(target.remaining)}. Boleh dibayar sebagian.`} onClose={onClose}>
    <form onSubmit={onSave}>
      <div className="form-grid">
        <div className="field"><label htmlFor="pay-amount">Nominal (Rp) *</label><input className="input" id="pay-amount" name="amount" type="number" min="1" max={target.remaining} defaultValue={target.remaining} /></div>
        <div className="field"><label htmlFor="pay-method">Metode *</label><select className="select" id="pay-method" name="paymentMethod" defaultValue="TUNAI"><option value="TUNAI">Tunai</option><option value="TRANSFER">Transfer</option><option value="QRIS">QRIS</option></select></div>
        <div className="field full"><label htmlFor="pay-proof">Bukti pembayaran</label><input className="input" id="pay-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></div>
        <div className="field full"><label htmlFor="pay-notes">Catatan</label><textarea className="textarea" id="pay-notes" name="notes" placeholder="Contoh: Transfer BCA a/n Budi" /></div>
      </div>
      <ModalFooter onClose={onClose} submitLabel="Simpan pembayaran" />
    </form>
  </Modal>;
}

function CashReconModal({ onClose, onSave }: { onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title="Rekonsiliasi kas" description="Masukkan saldo kas fisik aktual dan bandingkan dengan saldo sistem." onClose={onClose}>
    <form onSubmit={onSave}>
      <div className="form-grid">
        <div className="field"><label htmlFor="recon-date">Tanggal *</label><input className="input" id="recon-date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
        <div className="field"><label htmlFor="recon-system">Kas sistem (Rp) *</label><input className="input" id="recon-system" name="systemCash" type="number" min="0" placeholder="Otomatis dari laporan" /></div>
        <div className="field full"><label htmlFor="recon-physical">Kas fisik (Rp) *</label><input className="input" id="recon-physical" name="physicalCash" type="number" min="0" placeholder="Hasil hitung manual di laci" /></div>
        <div className="field full"><label htmlFor="recon-notes">Catatan</label><textarea className="textarea" id="recon-notes" name="notes" placeholder="Contoh: Selisih karena uang bensin kemarin" /></div>
      </div>
      <ModalFooter onClose={onClose} submitLabel="Simpan rekonsiliasi" />
    </form>
  </Modal>;
}
