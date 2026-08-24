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
import { backendRequest } from "@/lib/client-api";

type View = "dashboard" | "pos" | "products" | "materials" | "production" | "purchases" | "parties" | "receivables" | "expenses" | "reports" | "settings";
type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER" | "HUTANG";
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

const CASHIER_VIEWS: View[] = ["pos", "settings"];

const navSections = [
  { label: "Workspace", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { id: "pos", label: "Kasir POS", icon: ShoppingCart }] },
  { label: "Operasional", items: [{ id: "products", label: "Produk Jadi", icon: Package }, { id: "materials", label: "Bahan Baku", icon: Leaf }, { id: "production", label: "Produksi Batch", icon: Boxes }, { id: "purchases", label: "Pembelian", icon: Truck }, { id: "parties", label: "Pelanggan & Supplier", icon: Users }] },
  { label: "Keuangan", items: [{ id: "receivables", label: "Piutang", icon: WalletCards }, { id: "expenses", label: "Pengeluaran", icon: CircleDollarSign }, { id: "reports", label: "Laporan", icon: BarChart3 }] },
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
  const [modal, setModal] = useState<"product" | "material" | "payment" | "expense" | "production" | "purchase" | "capital" | "party" | "receipt" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastSale, setLastSale] = useState<{ id: string; total: number; method: PaymentMethod; paid: number; change: number; items: CartItem[] } | null>(null);
  const [dark, setDark] = useState(false);

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
    backendRequest<{ business?: Record<string, unknown>; customers?: Array<Record<string, unknown>>; suppliers?: Array<Record<string, unknown>>; products?: Array<Record<string, unknown>>; materials?: Array<Record<string, unknown>>; receivables?: Array<Record<string, unknown>>; expenses?: Array<Record<string, unknown>>; purchases?: Array<Record<string, unknown>>; batches?: Array<Record<string, unknown>>; payables?: Array<Record<string, unknown>>; capitalEntries?: Array<Record<string, unknown>>; sales?: Array<Record<string, unknown>>; saleItems?: Array<Record<string, unknown>> }>("/api/bootstrap").then((data) => {
      if (data.business?.name) setBusinessName(String(data.business.name));
      if (data.business) setBusinessProfile({ name: String(data.business.name || ""), phone: String(data.business.phone || ""), address: String(data.business.address || ""), receipt_footer: String(data.business.receipt_footer || ""), paper_width: Number(data.business.paper_width) === 80 ? 80 : 58 });
      if (data.products) setProducts(data.products.map((item) => ({ id: String(item.id), name: String(item.name), category: String(item.category || "Lainnya"), stock: Number(item.stock_qty || 0), unit: String((item.units as { code?: string } | undefined)?.code || "pcs"), price: Number(item.sale_price || 0), cogs: Number(item.last_cogs || 0), emoji: initials(String(item.name)), active: Boolean(item.is_active) })));
      if (data.materials) setMaterials(data.materials.map((item) => ({ id: String(item.id), name: String(item.name), stock: Number(item.stock_qty || 0), unit: String((item.units as { code?: string } | undefined)?.code || "pcs"), lastBuy: Number(item.last_buy_price || 0), supplier: "Supplier tersimpan", active: Boolean(item.is_active) })));
      if (data.receivables) setReceivables(data.receivables.map((item) => ({ id: String(item.id), customer: String((item.parties as { name?: string } | undefined)?.name || "Pelanggan"), invoice: String(item.transaction_id || ""), amount: Number(item.amount || 0), paid: Number(item.paid_amount || 0), due: String(item.due_date) })));
      if (data.expenses) setExpenses(data.expenses.map((item) => ({ id: String(item.id), date: String(item.expense_date), category: String(item.category), amount: Number(item.amount || 0), note: String(item.notes || ""), type: String(item.expense_type || "OPERATING") as Expense["type"] })));
      if (data.batches) setBatches(data.batches.map((item) => ({ id: String(item.id), code: String(item.batch_code), date: String(item.produced_at).slice(0, 10), product: String((item.items as { name?: string } | undefined)?.name || "Produk"), qty: Number(item.output_qty || 0), cogs: Number(item.cogs_per_unit || 0) })));
      if (data.capitalEntries) setCapitalEntries(data.capitalEntries.map((item) => ({ id: String(item.id), date: String(item.entry_date), type: String(item.entry_type) as CapitalEntry["type"], amount: Number(item.amount || 0), notes: String(item.notes || "") })));
      if (data.payables) setPayables(data.payables.map((item) => ({ id: String(item.id), date: String(item.updated_at || "").slice(0, 10), supplier: String((item.parties as { name?: string } | undefined)?.name || "Supplier"), total: Number(item.amount || 0), paid: Number(item.paid_amount || 0), remaining: Number(item.amount || 0) - Number(item.paid_amount || 0), status: String(item.status) as Purchase["status"] })));
      if (data.purchases) setPurchases(data.purchases.map((item) => { const payable = data.payables?.find((entry) => String(entry.transaction_id) === String(item.id)); const total = Number(item.total || 0); const paid = payable ? Number(payable.paid_amount || 0) : Number(item.paid_amount || 0); return { id: String(item.id), payableId: payable ? String(payable.id) : undefined, date: String(item.occurred_at || "").slice(0, 10), supplier: String((item.parties as { name?: string } | undefined)?.name || "Supplier"), total, paid, remaining: Math.max(0, total - paid), status: paid >= total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM_LUNAS" } as Purchase; }));
      if (data.sales) setSales(data.sales.map((item) => ({ id: String(item.id), date: String(item.occurred_at || "").slice(0, 10), total: Number(item.total || 0), cogs: 0 })));
      const mapParty = (item: Record<string, unknown>): Party => ({ id: String(item.id), name: String(item.name), type: String(item.party_type) === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER", phone: String(item.phone || ""), address: String(item.address || ""), creditLimit: Number(item.credit_limit || 0) });
      if (data.customers || data.suppliers) setParties([...(data.customers || []).map(mapParty), ...(data.suppliers || []).map(mapParty)]);
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
    window.localStorage.setItem("dapurkasir-demo", JSON.stringify({ products, materials, receivables, expenses, purchases, batches, capitalEntries, payables, sales, salesCount }));
  }, [products, materials, receivables, expenses, purchases, batches, capitalEntries, payables, sales, salesCount]);

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

  const openCreate = (kind: "product" | "material" | "expense" | "production" | "purchase" | "capital" | "party") => setModal(kind);

  const saveBusinessProfile = async (profile: BusinessProfile) => {
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/business/profile", { method: "PATCH", body: JSON.stringify(profile) }); }
      catch (error) { notify(error instanceof Error ? error.message : "Profil usaha gagal disimpan.", "error"); throw error; }
    }
    setBusinessProfile(profile);
    setBusinessName(profile.name);
    notify("Profil usaha berhasil disimpan.");
  };

  const handlePayment = async (method: PaymentMethod, cash: number, customer: string, dueDate: string, override: string) => {
    if (!cart.length) return notify("Keranjang masih kosong.", "error");
    if (plan.name !== "PRO" && salesCount >= plan.salesLimit) return notify(`Batas ${plan.salesLimit} transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.`, "error");
    const shortage = cart.filter((item) => item.qty > item.stock);
    if (shortage.length && (!override || override.trim().length < 5)) return notify(`Stok ${shortage[0].name} tidak mencukupi. Owner perlu alasan override minimal 5 karakter.`, "error");
    if (method === "TUNAI" && cash < cartTotal) return notify(`Pembayaran kurang ${rupiah(cartTotal - cash)}.`, "error");
    if (method === "HUTANG" && (!customer || !dueDate)) return notify("Pilih pelanggan dan tanggal jatuh tempo untuk penjualan hutang.", "error");
    const saleId = `TRX-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(salesCount + 1).padStart(3, "0")}`;
    const paid = method === "TUNAI" ? cash : method === "HUTANG" ? 0 : cartTotal;
    const change = method === "TUNAI" ? cash - cartTotal : 0;
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/pos/checkout", { method: "POST", body: JSON.stringify({ payment_method: method, customer_name: customer, due_date: dueDate, paid_amount: paid, override_reason: override || null, items: cart.map((item) => ({ item_id: item.id, qty: item.qty, unit_price: item.price })) }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Transaksi gagal diproses.", "error"); }
    }
    setProducts((current) => current.map((product) => {
      const sold = cart.find((item) => item.id === product.id);
      return sold ? { ...product, stock: product.stock - sold.qty } : product;
    }));
    setSales((current) => [{ id: saleId, date: new Date().toISOString().slice(0, 10), total: cartTotal, cogs: cart.reduce((sum, item) => sum + item.cogs * item.qty, 0) }, ...current]);
    if (method === "HUTANG") setReceivables((current) => [{ id: `r-${Date.now()}`, customer, invoice: saleId, amount: cartTotal, paid: 0, due: dueDate }, ...current]);
    setSalesCount((count) => count + 1);
    setLastSale({ id: saleId, total: cartTotal, method, paid, change, items: cart });
    setCart([]);
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

  const saveParty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const type = String(form.get("partyType") || "CUSTOMER") as Party["type"];
    const creditLimit = Number(form.get("creditLimit") || 0);
    if (!name) return notify("Nama wajib diisi.", "error");
    if (creditLimit < 0) return notify("Limit piutang tidak boleh negatif.", "error");
    let id = `pt-${Date.now()}`;
    if (BACKEND_ENABLED) {
      try {
        const rows = await backendRequest<Array<{ id: string }>>("/api/parties", { method: "POST", body: JSON.stringify({ name, party_type: type, phone: String(form.get("phone") || ""), address: String(form.get("address") || ""), credit_limit: creditLimit }) });
        if (rows?.[0]?.id) id = String(rows[0].id);
      } catch (error) { return notify(error instanceof Error ? error.message : "Data gagal disimpan.", "error"); }
    }
    setParties((current) => [{ id, name, type, phone: String(form.get("phone") || ""), address: String(form.get("address") || ""), creditLimit }, ...current]);
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
    const outputId = String(form.get("output") || "");
    const outputQty = Number(form.get("outputQty") || 0);
    const materialIds = form.getAll("material").map(String);
    const materialQtys = form.getAll("materialQty").map(Number);
    const otherCost = Number(form.get("otherCost") || 0);
    const output = products.find((item) => item.id === outputId);
    const rows = materialIds.map((id, index) => ({ material: materials.find((item) => item.id === id), qty: materialQtys[index] }));
    if (!output || outputQty <= 0 || !rows.length || rows.some((row) => !row.material || row.qty <= 0)) return notify("Pilih produk dan minimal satu bahan dengan kuantitas valid.", "error");
    if (rows.some((row) => row.material!.stock < row.qty)) return notify("Stok salah satu bahan tidak mencukupi.", "error");
    const materialCost = rows.reduce((sum, row) => sum + row.qty * row.material!.lastBuy, 0);
    const cogs = Math.round(((materialCost + Math.max(0, otherCost)) / outputQty) * 100) / 100;
    if (BACKEND_ENABLED) {
      try { await backendRequest("/api/production/batch", { method: "POST", body: JSON.stringify({ output_item_id: outputId, output_qty: outputQty, other_cost: otherCost, materials: rows.map((row) => ({ item_id: row.material!.id, qty_used: row.qty })) }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Batch gagal disimpan.", "error"); }
    }
    setMaterials((current) => current.map((item) => { const row = rows.find((candidate) => candidate.material!.id === item.id); return row ? { ...item, stock: item.stock - row.qty } : item; }));
    setProducts((current) => current.map((item) => item.id === output.id ? { ...item, stock: item.stock + outputQty, cogs } : item));
    setBatches((current) => [{ id: `bt-${Date.now()}`, code: `BATCH-${new Date().toISOString().slice(0, 10).replaceAll("-", "").slice(2)}-${String(current.length + 1).padStart(3, "0")}`, date: new Date().toISOString().slice(0, 10), product: output.name, qty: outputQty, cogs }, ...current]);
    setModal(null);
    notify(`Batch selesai. HPP ${output.name} menjadi ${rupiah(cogs)}/unit.`);
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

  const payPayable = async (id: string) => { const payable = payables.find((item) => item.id === id); if (!payable || payable.remaining <= 0) return; const amount = Number(window.prompt(`Masukkan pembayaran (maks. ${rupiah(payable.remaining)})`, String(payable.remaining))); if (!amount || amount <= 0 || amount > payable.remaining) return notify("Nominal pembayaran tidak valid.", "error"); if (BACKEND_ENABLED) try { await backendRequest(`/api/payables/${id}/pay`, { method: "POST", body: JSON.stringify({ amount, payment_method: "TUNAI" }) }); } catch (error) { return notify(error instanceof Error ? error.message : "Pembayaran utang gagal.", "error"); } setPayables((current) => current.map((item) => item.id === id ? { ...item, paid: item.paid + amount, remaining: item.remaining - amount, status: item.remaining - amount <= 0 ? "LUNAS" : "SEBAGIAN" } : item)); setPurchases((current) => current.map((item) => item.payableId === id ? { ...item, paid: item.paid + amount, remaining: item.remaining - amount, status: item.remaining - amount <= 0 ? "LUNAS" : "SEBAGIAN" } : item)); notify(`Pembayaran ${rupiah(amount)} dicatat.`); };

  const payReceivable = async (id: string) => {
    const receivable = receivables.find((item) => item.id === id);
    if (!receivable) return;
    const remaining = receivable.amount - receivable.paid;
    const value = window.prompt(`Masukkan pembayaran (maks. ${rupiah(remaining)})`, String(remaining));
    const amount = Number(value);
    if (!amount || amount <= 0 || amount > remaining) return notify("Nominal pembayaran tidak valid.", "error");
    if (BACKEND_ENABLED) {
      try { await backendRequest(`/api/receivables/${id}/pay`, { method: "POST", body: JSON.stringify({ amount, payment_method: "TUNAI" }) }); }
      catch (error) { return notify(error instanceof Error ? error.message : "Pembayaran piutang gagal.", "error"); }
    }
    setReceivables((current) => current.map((item) => item.id === id ? { ...item, paid: item.paid + amount } : item));
    notify(`Pembayaran ${rupiah(amount)} diterima.`);
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
        {view === "pos" && <POS products={products} cart={cart} total={cartTotal} onAdd={addToCart} onChangeQty={changeCartQty} onPay={() => setModal("payment")} onNewProduct={() => openCreate("product")} />}
        {view === "products" && <ItemList title="Produk Jadi" description="Kelola produk siap jual dan pantau stoknya." items={products} kind="product" onAdd={() => openCreate("product")} onNavigate={navigate} />}
        {view === "materials" && <MaterialList materials={materials} onAdd={() => openCreate("material")} />}
        {view === "production" && <ProductionView batches={batches} products={products} materials={materials} onAdd={() => openCreate("production")} />}
         {view === "purchases" && <PurchaseView2 purchases={purchases} materials={materials} onAdd={() => openCreate("purchase")} onPay={payPayable} />}
        {view === "parties" && <PartyView parties={parties} onAdd={() => openCreate("party")} />}
        {view === "receivables" && <ReceivableView receivables={receivables} onPay={payReceivable} />}
        {view === "expenses" && <ExpenseView expenses={expenses} onAdd={() => openCreate("expense")} />}
         {view === "reports" && <ReportView2 expenses={expenses} capitalEntries={capitalEntries} purchases={purchases} receivables={receivables} products={products} sales={sales} exportReport={exportReport} onAddCapital={() => openCreate("capital")} />}
        {view === "settings" && <SettingsView dark={dark} setDark={setDark} notify={notify} onReset={resetAllData} onSeed={fillDummyData} businessProfile={businessProfile} onSaveProfile={saveBusinessProfile} />}
        <BottomNav view={view} navigate={navigate} role={account.role} />
      </div>
      {modal === "product" && <ItemModal kind="product" onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal === "material" && <ItemModal kind="material" onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal === "expense" && <ExpenseModal2 onClose={() => setModal(null)} onSave={saveExpense} />}
      {modal === "production" && <ProductionModal2 products={products} materials={materials} onClose={() => setModal(null)} onSave={saveProduction} />}
      {modal === "purchase" && <PurchaseModal2 materials={materials} onClose={() => setModal(null)} onSave={savePurchase} />}
      {modal === "capital" && <CapitalModal onClose={() => setModal(null)} onSave={saveCapital} />}
      {modal === "party" && <PartyModal onClose={() => setModal(null)} onSave={saveParty} />}
      {modal === "payment" && <PaymentModal total={cartTotal} customers={receivables.map((item) => item.customer)} onClose={() => setModal(null)} onPay={handlePayment} />}
      {modal === "receipt" && lastSale && <ReceiptModal sale={lastSale} onClose={() => setModal(null)} onPrint={() => notify("Struk dikirim ke printer. Jika gagal, bagikan struk digital.", "default")} />}
      {toast && <div className={`toast ${toast.tone}`} role="status"><Check size={16} />{toast.message}</div>}
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

function BottomNav({ view, navigate, role }: { view: View; navigate: (view: View) => void; role: "OWNER" | "KASIR" }) {
  const all: { id: View; label: string; icon: typeof LayoutDashboard }[] = [{ id: "pos", label: "Kasir", icon: ShoppingCart }, { id: "production", label: "Produksi", icon: Boxes }, { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard }, { id: "settings", label: "Menu", icon: MoreHorizontal }];
  const items = role === "KASIR" ? all.filter((item) => CASHIER_VIEWS.includes(item.id)) : all;
  return <nav className="bottom-nav" aria-label="Navigasi mobile">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19} />{item.label}</button>; })}</nav>;
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
        <section className="callout success"><Sparkles size={17} /><div><strong>Margin sehat hari ini</strong><p>Laba kotor berada 4,2% di atas rata-rata minggu ini.</p></div></section>
      </div>
    </div>
    <div className="split-grid" style={{ marginTop: 18 }}><section className="card card-pad"><div className="section-header"><div><h2>Produk terlaris</h2><p>Kontribusi penjualan bulan ini</p></div><button className="section-link" onClick={() => navigate("products")}>Kelola produk</button></div><div className="activity-list">{products.slice(0, 3).map((product, index) => <div className="activity-row" key={product.id}><div className="item-avatar">0{index + 1}</div><div className="row-main"><strong>{product.name}</strong><span>{[86, 64, 48][index]} unit terjual</span></div><span className="row-side">{[27, 21, 16][index]}%</span></div>)}</div></section><section className="card card-pad"><div className="section-header"><div><h2>Ringkas paket</h2><p>Pemakaian bulan berjalan</p></div><span className="badge badge-emerald">FREE</span></div><div className="progress-line"><span>Transaksi POS</span><strong>{dashboardData?.plan.salesCount ?? salesCount} / 50</strong></div><div className="progress"><span style={{ width: `${((dashboardData?.plan.salesCount ?? salesCount) / 50) * 100}%` }} /></div><div className="progress-line"><span>Produk jadi</span><strong>{dashboardData?.plan.productCount ?? products.length} / 30</strong></div><div className="progress"><span style={{ width: `${((dashboardData?.plan.productCount ?? products.length) / 30) * 100}%` }} /></div><div className="progress-line"><span>Bahan baku</span><strong>{dashboardData?.plan.materialCount ?? materials.length} / 10</strong></div><div className="progress"><span style={{ width: `${((dashboardData?.plan.materialCount ?? materials.length) / 10) * 100}%` }} /></div></section></div>
  </main>;
}

function Kpi({ label, value, foot, icon, tone }: { label: string; value: string; foot: ReactNode; icon: ReactNode; tone?: "warning" }) { return <div className="kpi-card"><div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone === "warning" ? "" : ""}`}>{icon}</span></div><p className="kpi-value">{value}</p><div className="kpi-foot">{foot}</div></div>; }
function Activity({ icon, title, detail, value, time }: { icon: ReactNode; title: string; detail: string; value: string; time: string }) { return <div className="activity-row"><div className="item-avatar">{icon}</div><div className="row-main"><strong>{title}</strong><span>{detail} · {time}</span></div><span className="row-side">{value}</span></div>; }

function POS({ products, cart, total, onAdd, onChangeQty, onPay, onNewProduct }: { products: Product[]; cart: CartItem[]; total: number; onAdd: (product: Product) => void; onChangeQty: (id: string, delta: number) => void; onPay: () => void; onNewProduct: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const categories = ["Semua", ...Array.from(new Set(products.map((item) => item.category)))];
  const filtered = products.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) && (category === "Semua" || item.category === category));
  return <main className="pos-page"><div className="pos-layout"><section><div className="pos-heading"><div><p className="eyebrow">Shift pagi · kasir aktif</p><h1>Mulai transaksi</h1><p>Pilih produk atau cari nama menu di bawah.</p></div><div className="pos-controls"><button className="button button-secondary" onClick={onNewProduct}><Plus size={16} /><span>Produk baru</span></button><button className="icon-button" aria-label="Pengaturan POS"><SlidersHorizontal size={17} /></button></div></div><div className="search-field pos-search"><Search size={17} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." aria-label="Cari produk" /></div><div className="category-row">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="product-grid">{filtered.map((product) => <button className="product-card" key={product.id} onClick={() => onAdd(product)} disabled={!product.active}><div className="product-card-top"><span className="product-emoji">{product.emoji}</span><span className={`badge ${product.stock <= 5 ? "badge-amber" : "badge-green"}`}>{product.stock} {product.unit}</span></div><div><p className="product-name">{product.name}</p><span className="product-price">{rupiah(product.price)}</span></div></button>)}{!filtered.length && <div className="empty-state"><Search size={24} /><strong>Produk tidak ditemukan</strong><p>Coba kata kunci atau kategori lain.</p></div>}</div></section><aside className="card cart-panel"><div className="cart-header"><div><h2>Keranjang</h2><span style={{ color: "var(--muted)", fontSize: 11 }}>Transaksi baru</span></div><span className="cart-count">{cart.reduce((sum, item) => sum + item.qty, 0)} item</span></div><div className="cart-items">{cart.length ? cart.map((item) => <div className="cart-item" key={item.id}><div><strong>{item.name}</strong><small>{rupiah(item.price)} / {item.unit}</small><div className="qty-control"><button className="qty-button" onClick={() => onChangeQty(item.id, -1)} aria-label={`Kurangi ${item.name}`}><Minus size={14} /></button><span className="qty-number">{item.qty}</span><button className="qty-button" onClick={() => onChangeQty(item.id, 1)} aria-label={`Tambah ${item.name}`}><Plus size={14} /></button></div></div><span className="cart-subtotal">{rupiah(item.price * item.qty)}</span></div>) : <div className="empty-state"><ShoppingCart size={25} /><strong>Keranjang masih kosong</strong><p>Tap produk di sebelah kiri untuk mulai menambahkan pesanan.</p></div>}</div><div className="cart-footer"><div className="total-row"><span>Total tagihan</span><strong>{rupiah(total)}</strong></div><button className="button button-primary" style={{ width: "100%", minHeight: 48 }} disabled={!cart.length} onClick={onPay}>Bayar sekarang <ChevronRight size={17} /></button></div></aside></div></main>;
}

function ItemList({ title, description, items, kind, onAdd, onNavigate }: { title: string; description: string; items: Product[]; kind: "product"; onAdd: () => void; onNavigate: (view: View) => void }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><PageHeading eyebrow="Master data" title={title} description={description} action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah produk</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." aria-label="Cari produk" /></div><button className="button button-secondary"><SlidersHorizontal size={15} />Filter</button></div><section className="card table-wrap"><table><thead><tr><th>Produk</th><th>Kategori</th><th>Harga jual</th><th>HPP / unit</th><th className="text-right">Stok</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="item-cell"><span className="item-avatar">{item.emoji}</span><div><strong>{item.name}</strong><span>Satuan {item.unit}</span></div></div></td><td>{item.category}</td><td className="table-primary">{rupiah(item.price)}</td><td>{item.cogs ? rupiah(item.cogs) : <span className="table-muted">Belum ada</span>}</td><td className="text-right table-primary">{item.stock} {item.unit}</td><td><span className="badge badge-green">Aktif</span></td><td className="text-right"><button className="button button-ghost" onClick={() => onNavigate("settings")}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></section></main>;
}

function MaterialList({ materials, onAdd }: { materials: Material[]; onAdd: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = materials.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><PageHeading eyebrow="Master data" title="Bahan baku" description="Pastikan bahan utama selalu tersedia sebelum produksi dimulai." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah bahan</button>} /><div className="callout warning" style={{ marginBottom: 18 }}><Leaf size={17} /><div><strong>{materials.filter((item) => item.stock <= 2).length} bahan perlu diperiksa</strong><p>Restock bahan yang berada di bawah batas aman produksi.</p></div></div><div className="toolbar"><div className="search-field"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari bahan baku..." aria-label="Cari bahan baku" /></div></div><section className="card table-wrap"><table><thead><tr><th>Bahan baku</th><th>Supplier terakhir</th><th>Harga beli terakhir</th><th className="text-right">Stok tersedia</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="item-cell"><span className="item-avatar"><Leaf size={15} /></span><div><strong>{item.name}</strong><span>Satuan {item.unit}</span></div></div></td><td>{item.supplier}</td><td className="table-primary">{rupiah(item.lastBuy)} / {item.unit}</td><td className={`text-right table-primary ${item.stock <= 2 ? "negative" : ""}`}>{item.stock} {item.unit}</td><td><span className={`badge ${item.stock <= 2 ? "badge-amber" : "badge-green"}`}>{item.stock <= 2 ? "Kritis" : "Aman"}</span></td><td className="text-right"><button className="button button-ghost"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></section></main>;
}

function ProductionView({ batches, products, materials, onAdd }: { batches: Batch[]; products: Product[]; materials: Material[]; onAdd: () => void }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyBatches = batches.filter((batch) => batch.date.slice(0, 7) === currentMonth);

  return <main className="page"><PageHeading eyebrow="Produksi" title="Produksi batch" description="Ubah bahan baku menjadi stok produk dengan HPP yang terukur." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Buat batch produksi</button>} /><div className="page-card-grid"><div className="mini-stat"><span className="mini-stat-label">Batch bulan ini</span><p className="mini-stat-value">{monthlyBatches.length}</p></div><div className="mini-stat"><span className="mini-stat-label">Produk aktif</span><p className="mini-stat-value">{products.length}</p></div><div className="mini-stat"><span className="mini-stat-label">Bahan terpantau</span><p className="mini-stat-value">{materials.length}</p></div></div><section className="card table-wrap" style={{ marginTop: 18 }}><div className="card-pad section-header"><div><h2>Riwayat batch</h2><p>HPP tersimpan dari setiap proses produksi</p></div><span className="badge badge-blue">Terbaru</span></div><table><thead><tr><th>Kode batch</th><th>Produk output</th><th>Qty hasil</th><th>HPP / unit</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td className="table-primary" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{batch.code}</td><td>{batch.product}</td><td>{batch.qty} unit</td><td className="table-primary">{rupiah(batch.cogs)}</td><td className="table-muted">{dateLabel(batch.date)}</td><td><span className="badge badge-green">Selesai</span></td></tr>)}</tbody></table></section></main>;
}

function PurchaseView({ purchases, materials, onAdd }: { purchases: Purchase[]; materials: Material[]; onAdd: () => void }) { const debt = purchases.reduce((sum, item) => sum + item.remaining, 0); return <main className="page"><PageHeading eyebrow="Operasional" title="Pembelian bahan" description="Catat pembelian, perbarui stok, dan pantau utang supplier." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Catat pembelian</button>} /><div className="page-card-grid"><div className="mini-stat"><span className="mini-stat-label">Pembelian bulan ini</span><p className="mini-stat-value">{purchases.length}</p></div><div className="mini-stat"><span className="mini-stat-label">Total belanja</span><p className="mini-stat-value">{shortRupiah(purchases.reduce((sum, item) => sum + item.total, 0))}</p></div><div className="mini-stat"><span className="mini-stat-label">Utang supplier</span><p className="mini-stat-value negative">{shortRupiah(debt)}</p></div></div><section className="card table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Detail</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td className="table-muted">{dateLabel(purchase.date)}</td><td className="table-primary">{purchase.supplier}</td><td>{materials.length} bahan tercatat</td><td className="table-primary">{rupiah(purchase.total)}</td><td><span className={`badge ${purchase.status === "LUNAS" ? "badge-green" : "badge-amber"}`}>{purchase.status === "LUNAS" ? "Lunas" : purchase.status === "SEBAGIAN" ? "Sebagian" : "Belum lunas"}</span></td><td><button className="button button-ghost"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></section></main>; }

function PartyView({ parties, onAdd }: { parties: Party[]; onAdd: () => void }) {
  const customers = parties.filter((item) => item.type === "CUSTOMER");
  const suppliers = parties.filter((item) => item.type === "SUPPLIER");
  const table = (rows: Party[], emptyLabel: string) => rows.length
    ? <section className="card table-wrap"><table><thead><tr><th>Nama</th><th>Telepon</th><th>Alamat</th><th className="text-right">Limit piutang</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td className="table-primary">{item.name}</td><td>{item.phone || <span className="table-muted">-</span>}</td><td>{item.address || <span className="table-muted">-</span>}</td><td className="text-right">{item.creditLimit > 0 ? rupiah(item.creditLimit) : <span className="table-muted">Tanpa limit</span>}</td></tr>)}</tbody></table></section>
    : <section className="card card-pad"><p className="table-muted">{emptyLabel}</p></section>;
  return <main className="page">
    <PageHeading eyebrow="Operasional" title="Pelanggan & supplier" description="Pelanggan baru otomatis tercatat saat penjualan hutang, supplier saat pembelian." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah</button>} />
    <div className="page-card-grid">
      <div className="mini-stat"><span className="mini-stat-label">Pelanggan</span><p className="mini-stat-value">{customers.length}</p></div>
      <div className="mini-stat"><span className="mini-stat-label">Supplier</span><p className="mini-stat-value">{suppliers.length}</p></div>
    </div>
    <div className="section-header" style={{ marginTop: 18 }}><div><h2>Pelanggan</h2><p>Dipakai untuk penjualan hutang dan piutang</p></div><UserRound size={18} color="var(--primary)" /></div>
    {table(customers, "Belum ada pelanggan. Akan terisi otomatis saat ada penjualan hutang.")}
    <div className="section-header" style={{ marginTop: 22 }}><div><h2>Supplier</h2><p>Dipakai untuk pembelian bahan dan utang usaha</p></div><Truck size={18} color="var(--primary)" /></div>
    {table(suppliers, "Belum ada supplier. Akan terisi otomatis saat ada pembelian.")}
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

function PaymentModal({ total, customers, onClose, onPay }: { total: number; customers: string[]; onClose: () => void; onPay: (method: PaymentMethod, cash: number, customer: string, due: string, override: string) => void }) { const [method, setMethod] = useState<PaymentMethod>("TUNAI"); const [cash, setCash] = useState(total); const [customer, setCustomer] = useState(""); const [due, setDue] = useState("2026-08-31"); const [override, setOverride] = useState(""); const methods: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [{ id: "TUNAI", label: "Tunai", icon: CircleDollarSign }, { id: "QRIS", label: "QRIS", icon: QrCode }, { id: "TRANSFER", label: "Transfer", icon: CreditCard }, { id: "HUTANG", label: "Hutang", icon: ClipboardList }]; return <Modal title="Pembayaran" description="Pilih metode pembayaran untuk menyelesaikan transaksi." onClose={onClose}><div className="amount-preview"><span>Total tagihan</span><strong>{rupiah(total)}</strong></div><div className="modal-divider" /><div className="field"><label>Metode pembayaran</label><div className="payment-methods">{methods.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={`payment-method ${method === item.id ? "active" : ""}`} onClick={() => setMethod(item.id)}><Icon size={18} />{item.label}</button>; })}</div></div>{method === "TUNAI" && <div className="form-grid" style={{ marginTop: 17 }}><div className="field full"><label htmlFor="cash">Uang diterima</label><input className="input" id="cash" type="number" min={total} value={cash} onChange={(event) => setCash(Number(event.target.value))} /></div><div className="callout success field full"><CircleDollarSign size={17} /><div><strong>Kembalian {cash >= total ? rupiah(cash - total) : "Belum cukup"}</strong><p>{cash >= total ? "Nominal siap dikonfirmasi." : `Kurang ${rupiah(total - cash)}`}</p></div></div></div>}{method === "HUTANG" && <div className="form-grid" style={{ marginTop: 17 }}><div className="field full"><label htmlFor="customer">Pelanggan <span>*</span></label><select className="select" id="customer" value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">Pilih pelanggan aktif</option>{customers.map((item) => <option key={item}>{item}</option>)}<option>Warung Maju Jaya</option></select></div><div className="field full"><label htmlFor="due">Tanggal jatuh tempo <span>*</span></label><input className="input" id="due" type="date" value={due} onChange={(event) => setDue(event.target.value)} /></div></div>}<div className="callout" style={{ marginTop: 16 }}><ShieldIcon /><div><strong>Stok divalidasi saat konfirmasi</strong><p>Jika owner perlu override stok, alasan dicatat di audit transaksi.</p></div></div><div className="field" style={{ marginTop: 14 }}><label htmlFor="override">Alasan override stok <span style={{ color: "var(--muted)" }}>(opsional)</span></label><input className="input" id="override" value={override} onChange={(event) => setOverride(event.target.value)} placeholder="Minimal 5 karakter jika stok kurang" /></div><div className="modal-footer" style={{ padding: "20px 0 0" }}><button type="button" className="button button-secondary" onClick={onClose}>Batal</button><button type="button" className="button button-primary" disabled={method === "TUNAI" && cash < total} onClick={() => onPay(method, cash, customer, due, override)}>Konfirmasi pembayaran <Check size={16} /></button></div></Modal>; }

function ShieldIcon() { return <span style={{ display: "grid", placeItems: "center", width: 17, height: 17, border: "2px solid currentColor", borderRadius: "50%", fontSize: 9 }}>✓</span>; }
function ReceiptModal({ sale, onClose, onPrint }: { sale: { id: string; total: number; method: PaymentMethod; paid: number; change: number; items: CartItem[] }; onClose: () => void; onPrint: () => void }) { return <Modal title="Transaksi berhasil" description={`Nomor transaksi ${sale.id}`} onClose={onClose}><div className="receipt"><div className="receipt-head"><strong>DAPUR SARI NUSANTARA</strong><span>Jl. Melati No. 18, Bandung</span><span>24 Agustus 2026 · 10:42</span></div>{sale.items.map((item) => <div className="receipt-line" key={item.id}><span>{item.name} x{item.qty}</span><strong>{rupiah(item.price * item.qty)}</strong></div>)}<div className="receipt-line receipt-total"><span>TOTAL</span><strong>{rupiah(sale.total)}</strong></div><div className="receipt-line"><span>{sale.method}</span><span>{rupiah(sale.paid)}</span></div>{sale.change > 0 && <div className="receipt-line"><span>Kembalian</span><strong>{rupiah(sale.change)}</strong></div>}<div className="receipt-foot">Terima kasih sudah mendukung usaha lokal.</div></div><div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}><button className="button button-secondary" onClick={onPrint}><Printer size={16} />Cetak struk</button><button className="button button-primary" onClick={() => { navigator.share?.({ title: "Struk DapurKasir", text: `Transaksi ${sale.id} sebesar ${rupiah(sale.total)}` }); }}>Bagikan struk</button></div><button className="button button-ghost" style={{ width: "100%" }} onClick={onClose}>Transaksi baru</button></Modal>; }

function Modal({ title, description, children, onClose, large }: { title: string; description?: string; children: ReactNode; onClose: () => void; large?: boolean }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${large ? "large" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={17} /></button></div><div className="modal-body">{children}</div></div></div>; }
function ModalFooter({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) { return <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Batal</button><button type="submit" className="button button-primary">{submitLabel}<Check size={16} /></button></div>; }

  function PurchaseView2({ purchases, materials, onAdd, onPay }: { purchases: Purchase[]; materials: Material[]; onAdd: () => void; onPay: (id: string) => void }) { const debt = purchases.reduce((sum, item) => sum + item.remaining, 0); return <main className="page"><PageHeading eyebrow="Operasional" title="Pembelian bahan" description="Catat pembelian, pembayaran parsial, dan utang supplier." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} />Catat pembelian</button>} /><div className="page-card-grid"><div className="mini-stat"><span className="mini-stat-label">Total pembelian</span><p className="mini-stat-value">{shortRupiah(purchases.reduce((sum, item) => sum + item.total, 0))}</p></div><div className="mini-stat"><span className="mini-stat-label">Sisa utang</span><p className="mini-stat-value negative">{shortRupiah(debt)}</p></div><div className="mini-stat"><span className="mini-stat-label">Transaksi</span><p className="mini-stat-value">{purchases.length}</p></div></div><section className="card table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th></th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td className="table-muted">{dateLabel(purchase.date)}</td><td className="table-primary">{purchase.supplier}</td><td>{rupiah(purchase.total)}</td><td>{rupiah(purchase.paid)}</td><td className="negative">{rupiah(purchase.remaining)}</td><td><span className={`badge ${purchase.status === "LUNAS" ? "badge-green" : "badge-amber"}`}>{purchase.status === "LUNAS" ? "Lunas" : purchase.status === "SEBAGIAN" ? "Sebagian" : "Belum lunas"}</span></td><td>{purchase.remaining > 0 && <button className="button button-primary" style={{ minHeight: 34, padding: "0 11px", fontSize: 11 }} onClick={() => onPay(purchase.payableId || purchase.id)}>Bayar</button>}</td></tr>)}</tbody></table></section></main>; }

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

  return <main className="page"><PageHeading eyebrow="Keuangan" title="Laporan" description="Laba rugi, arus kas, dan neraca dengan filter periode." action={<><button className="button button-secondary" onClick={onAddCapital}><Plus size={16} />Catat modal / prive</button><button className="button button-secondary" onClick={exportReport}><FileDown size={16} />Export CSV</button></>} /><div className="toolbar"><div className="field"><label>Dari tanggal</label><input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div className="field"><label>Sampai tanggal</label><input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></div><div className="category-row"><button className={`category-chip ${tab === "pnl" ? "active" : ""}`} onClick={() => setTab("pnl")}>Laporan Laba Rugi</button><button className={`category-chip ${tab === "cash" ? "active" : ""}`} onClick={() => setTab("cash")}>Laporan Arus Kas</button><button className={`category-chip ${tab === "balance" ? "active" : ""}`} onClick={() => setTab("balance")}>Laporan Neraca</button></div>{tab === "pnl" && <div className="kpi-grid"><Kpi label="Omzet" value={rupiah(revenue)} foot={<span>Penjualan pada periode</span>} icon={<TrendingUp size={16} />} /><Kpi label="COGS / HPP" value={rupiah(cogs)} foot={<span>HPP transaksi</span>} icon={<Boxes size={16} />} /><Kpi label="Beban operasional" value={rupiah(operating)} foot={<span>Prive tidak termasuk</span>} icon={<CircleDollarSign size={16} />} /><Kpi label="Laba bersih" value={rupiah(net)} foot={<span>{loadingReport ? "Memuat..." : server ? "Dihitung server" : "Perkiraan lokal"}</span>} icon={<BarChart3 size={16} />} /></div>}{tab === "cash" && <section className="card card-pad"><h2>Laporan Arus Kas</h2><p>Operasi {rupiah(revenue - operating)}</p><p>Pendanaan {rupiah(cash - revenue + operating)}</p><h3>Perubahan kas bersih {rupiah(cash)}</h3></section>}{tab === "balance" && <section className="card card-pad"><h2>Laporan Neraca</h2><p>Kas {rupiah(cash)}</p><p>Piutang {rupiah(receivableBalance)}</p><p>Persediaan {rupiah(inventory)}</p><p>Utang usaha {rupiah(payableBalance)}</p><p>Prive {rupiah(withdrawals)}</p></section>}<section className="card card-pad" style={{ marginTop: 18 }}><h2>Modal dan prive</h2>{capitalEntries.filter((item) => inRange(item.date)).map((item) => <div className="activity-row" key={item.id}><span>{item.type === "WITHDRAWAL" ? "Prive" : item.type === "INITIAL" ? "Modal awal" : "Tambahan modal"}</span><strong>{rupiah(item.amount)}</strong></div>)}</section></main>; }

function ExpenseModal2({ onClose, onSave }: { onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal title="Tambah pengeluaran" description="Pisahkan beban operasional dari prive pemilik." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field"><label htmlFor="date">Tanggal *</label><input className="input" id="date" name="date" type="date" defaultValue="2026-08-24" /></div><div className="field"><label htmlFor="expenseType">Jenis</label><select className="select" id="expenseType" name="expenseType"><option value="OPERATING">Beban operasional</option><option value="OWNER_WITHDRAWAL">Prive / tarik modal</option></select></div><div className="field"><label htmlFor="category">Kategori *</label><input className="input" id="category" name="category" defaultValue="Operasional" /></div><div className="field"><label htmlFor="amount">Nominal *</label><input className="input" id="amount" name="amount" type="number" min="1" /></div><div className="field full"><label htmlFor="note">Catatan</label><textarea className="textarea" id="note" name="note" /></div></div><ModalFooter onClose={onClose} submitLabel="Simpan pengeluaran" /></form></Modal>; }

function ProductionModal2({ products, materials, onClose, onSave }: { products: Product[]; materials: Material[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { const [rows, setRows] = useState([0]); return <Modal large title="Buat batch produksi" description="Satu batch dapat memakai banyak bahan baku." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field"><label>Produk output *</label><select className="select" name="output" defaultValue=""><option value="" disabled>Pilih produk</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Qty hasil *</label><input className="input" name="outputQty" type="number" min="0.01" step="0.01" /></div></div><div className="section-header" style={{ marginTop: 18 }}><h2>Bahan baku</h2><button type="button" className="button button-secondary" onClick={() => setRows((current) => [...current, current.length])}><Plus size={15} />Tambah bahan</button></div>{rows.map((row, index) => <div className="form-grid" key={row} style={{ marginTop: 10 }}><div className="field"><label>Bahan {index + 1} *</label><select className="select" name="material" defaultValue=""><option value="" disabled>Pilih bahan</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock} {item.unit})</option>)}</select></div><div className="field"><label>Qty digunakan *</label><input className="input" name="materialQty" type="number" min="0.01" step="0.01" /></div>{rows.length > 1 && <button type="button" className="button button-ghost" onClick={() => setRows((current) => current.filter((value) => value !== row))}><Trash2 size={16} /></button>}</div>)}<div className="field" style={{ marginTop: 12 }}><label>Biaya lain</label><input className="input" name="otherCost" type="number" min="0" /></div><ModalFooter onClose={onClose} submitLabel="Selesaikan batch" /></form></Modal>; }

function PurchaseModal2({ materials, onClose, onSave }: { materials: Material[]; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal title="Catat pembelian" description="Pembayaran awal dapat sebagian atau nol." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field full"><label>Supplier *</label><input className="input" name="supplier" placeholder="Nama supplier" /></div><div className="field full"><label>Bahan baku *</label><select className="select" name="material" defaultValue=""><option value="" disabled>Pilih bahan</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></div><div className="field"><label>Kuantitas *</label><input className="input" name="qty" type="number" min="0.01" step="0.01" /></div><div className="field"><label>Harga / unit *</label><input className="input" name="price" type="number" min="0" /></div><div className="field"><label>Dibayar sekarang</label><input className="input" name="paid" type="number" min="0" defaultValue="0" /></div><div className="field"><label>Metode pembayaran</label><select className="select" name="paymentMethod"><option>TUNAI</option><option>TRANSFER</option><option>QRIS</option></select></div><div className="field full"><label>Jatuh tempo</label><input className="input" name="dueDate" type="date" /></div></div><ModalFooter onClose={onClose} submitLabel="Simpan pembelian" /></form></Modal>; }

function CapitalModal({ onClose, onSave }: { onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) { return <Modal title="Catat modal / prive" description="Modal menambah ekuitas; prive mengurangi ekuitas dan tidak masuk laba rugi." onClose={onClose}><form onSubmit={onSave}><div className="form-grid"><div className="field full"><label>Jenis transaksi</label><select className="select" name="type"><option value="INITIAL">Modal awal</option><option value="ADDITION">Tambahan modal</option><option value="WITHDRAWAL">Prive / tarik modal</option></select></div><div className="field"><label>Tanggal *</label><input className="input" name="date" type="date" defaultValue="2026-08-24" /></div><div className="field"><label>Nominal *</label><input className="input" name="amount" type="number" min="1" /></div><div className="field full"><label>Catatan</label><textarea className="textarea" name="note" /></div></div><ModalFooter onClose={onClose} submitLabel="Simpan transaksi" /></form></Modal>; }

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
