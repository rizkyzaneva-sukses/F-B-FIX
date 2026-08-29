"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { backendRequest } from "@/lib/client-api";
import { defaultBusinessProfile, defaultPlan, downloadItemTemplate, initials, rupiah } from "@/lib/format";
import type {
  AgingRow,
  Batch,
  BusinessProfile,
  CapitalEntry,
  CartItem,
  CashRecon,
  DashboardData,
  DeliveryOrder,
  Expense,
  ImportKind,
  Invoice,
  Material,
  PartialPaymentTarget,
  Party,
  PaymentMethod,
  PlanState,
  Product,
  Purchase,
  Receivable,
  SaleSummary,
  SalesOrder,
  SettlementPaymentMethod,
  SupplierReturn,
  Toast,
  UserRole,
  View,
} from "@/lib/types";

// Layout components
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet";

// View components
import { DashboardView } from "@/components/views/dashboard-view";
import { POSView } from "@/components/views/pos-view";
import { ProductsView } from "@/components/views/products-view";
import { MaterialsView } from "@/components/views/materials-view";
import { ProductionView } from "@/components/views/production-view";
import { PurchasesView } from "@/components/views/purchases-view";
import { PartiesView } from "@/components/views/parties-view";
import { ReceivablesView } from "@/components/views/receivables-view";
import { ExpensesView } from "@/components/views/expenses-view";
import { CashReconView } from "@/components/views/cash-recon-view";
import { ReportsView } from "@/components/views/reports-view";
import { B2BOrdersView } from "@/components/views/b2b-orders-view";
import { B2BDeliveriesView } from "@/components/views/b2b-deliveries-view";
import { B2BInvoicesView } from "@/components/views/b2b-invoices-view";
import { B2BAgingView } from "@/components/views/b2b-aging-view";
import { GuideView } from "@/components/views/guide-view";
import { SettingsView } from "@/components/views/settings-view";

// Modal components
import { ItemModal } from "@/components/modals/item-modal";
import { PaymentModal } from "@/components/modals/payment-modal";
import { ReceiptModal } from "@/components/modals/receipt-modal";
import { ExpenseModal } from "@/components/modals/expense-modal";
import { ProductionModal } from "@/components/modals/production-modal";
import { PurchaseModal } from "@/components/modals/purchase-modal";
import { CapitalModal } from "@/components/modals/capital-modal";
import { PartyModal } from "@/components/modals/party-modal";
import { B2BOrderModal } from "@/components/modals/b2b-order-modal";
import { B2BDeliveryModal } from "@/components/modals/b2b-delivery-modal";
import { B2BInvoiceModal } from "@/components/modals/b2b-invoice-modal";
import { SupplierReturnModal } from "@/components/modals/supplier-return-modal";
import { CashReconModal } from "@/components/modals/cash-recon-modal";
import { PartialPaymentModal } from "@/components/modals/partial-payment-modal";

const ROLE_ALLOWED_VIEWS: Record<UserRole, View[]> = {
  OWNER: [
    "dashboard",
    "pos",
    "products",
    "materials",
    "production",
    "purchases",
    "parties",
    "receivables",
    "expenses",
    "cash-recon",
    "reports",
    "b2b-orders",
    "b2b-deliveries",
    "b2b-invoices",
    "b2b-aging",
    "guide",
    "settings",
  ],
  KASIR: ["pos", "parties", "b2b-orders", "b2b-deliveries", "guide"],
  GUDANG: ["products", "materials", "production", "purchases", "parties", "guide"],
  FINANCE: [
    "dashboard",
    "receivables",
    "expenses",
    "cash-recon",
    "reports",
    "b2b-invoices",
    "b2b-aging",
    "guide",
  ],
};

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
  const [account, setAccount] = useState<{ name: string; role: UserRole }>({
    name: "Owner",
    role: "OWNER",
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);
  const [cashRecons, setCashRecons] = useState<CashRecon[]>([]);
  const [modal, setModal] = useState<
    | "product"
    | "material"
    | "payment"
    | "expense"
    | "production"
    | "purchase"
    | "capital"
    | "party"
    | "receipt"
    | "b2b-order"
    | "b2b-delivery"
    | "b2b-invoice"
    | "return"
    | "cash-recon"
    | null
  >(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastSale, setLastSale] = useState<{
    id: string;
    subtotal: number;
    discount: number;
    total: number;
    method: PaymentMethod;
    paid: number;
    change: number;
    items: CartItem[];
  } | null>(null);
  const [dark, setDark] = useState(false);
  const [b2bOrders, setB2bOrders] = useState<SalesOrder[]>([]);
  const [b2bDeliveries, setB2bDeliveries] = useState<DeliveryOrder[]>([]);
  const [b2bInvoices, setB2bInvoices] = useState<Invoice[]>([]);
  const [b2bAging, setB2bAging] = useState<AgingRow[]>([]);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [partialPayment, setPartialPayment] = useState<PartialPaymentTarget | null>(null);

  const notify = (message: string, tone: Toast["tone"] = "success") =>
    setToast({ message, tone });

  const navigate = (next: View) => {
    const allowed = ROLE_ALLOWED_VIEWS[account.role] || ROLE_ALLOWED_VIEWS.OWNER;
    if (!allowed.includes(next)) {
      notify("Akses menu terbatas untuk role Anda.", "error");
      return;
    }
    setView(next);
  };

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === "error" ? 9000 : 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  // Service Worker register
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  // Midtrans redirect handler
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("payment");
    if (!status) return;
    window.history.replaceState(null, "", window.location.pathname);
    setView("settings");
    if (status === "success")
      notify("Pembayaran berhasil. Paket PRO sedang diaktifkan.");
    else if (status === "pending")
      notify("Pembayaran sedang diproses. Status akan diperbarui otomatis.", "default");
    else
      notify("Pembayaran belum berhasil. Silakan coba lagi dari halaman harga.", "error");
  }, []);

  // Load all initial data from backend
  useEffect(() => {
    // Session
    backendRequest<{ name?: string; role?: string }>("/api/auth/session")
      .then((data) => {
        const role = (data?.role as UserRole) || "OWNER";
        setAccount({ name: String(data?.name || "Owner"), role });
        if (role === "KASIR") setView("pos");
        else if (role === "GUDANG") setView("production");
        else if (role === "FINANCE") setView("dashboard");
      })
      .catch(() => undefined);

    // Dashboard
    backendRequest<DashboardData>("/api/dashboard")
      .then((data) => {
        setDashboardData(data);
        if (data.plan) setSalesCount(data.plan.salesCount);
      })
      .catch(() => undefined);

    // Subscription & Plan Limits
    backendRequest<{
      currentPlan: string;
      limits: { salesLimit: number; productLimit: number; materialLimit: number };
    }>("/api/subscription")
      .then((data) => {
        setPlan({
          name: data.currentPlan === "PRO" ? "PRO" : "FREE",
          salesLimit: data.limits.salesLimit,
          productLimit: data.limits.productLimit,
          materialLimit: data.limits.materialLimit,
        });
      })
      .catch(() => undefined);

    // Bootstrap general business data
    backendRequest<{
      business?: Record<string, unknown>;
      customers?: Array<Record<string, unknown>>;
      suppliers?: Array<Record<string, unknown>>;
      products?: Array<Record<string, unknown>>;
      materials?: Array<Record<string, unknown>>;
      receivables?: Array<Record<string, unknown>>;
      expenses?: Array<Record<string, unknown>>;
      purchases?: Array<Record<string, unknown>>;
      batches?: Array<Record<string, unknown>>;
      batchOutputs?: Array<Record<string, unknown>>;
      payables?: Array<Record<string, unknown>>;
      capitalEntries?: Array<Record<string, unknown>>;
      sales?: Array<Record<string, unknown>>;
      supplierReturns?: Array<Record<string, unknown>>;
      cashReconciliations?: Array<Record<string, unknown>>;
    }>("/api/bootstrap")
      .then((data) => {
        if (data.business?.name) setBusinessName(String(data.business.name));
        if (data.business) {
          setBusinessProfile({
            name: String(data.business.name || ""),
            phone: String(data.business.phone || ""),
            address: String(data.business.address || ""),
            receipt_footer: String(data.business.receipt_footer || ""),
            paper_width: Number(data.business.paper_width) === 80 ? 80 : 58,
          });
        }
        if (data.products) {
          setProducts(
            data.products.map((item) => ({
              id: String(item.id),
              name: String(item.name),
              category: String(item.category || "Lainnya"),
              stock: Number(item.stock_qty || 0),
              unit: String((item.units as { code?: string } | undefined)?.code || "pcs"),
              price: Number(item.sale_price || 0),
              cogs: Number(item.last_cogs || 0),
              emoji: initials(String(item.name)),
              active: Boolean(item.is_active),
            }))
          );
        }
        if (data.materials) {
          setMaterials(
            data.materials.map((item) => ({
              id: String(item.id),
              name: String(item.name),
              stock: Number(item.stock_qty || 0),
              unit: String((item.units as { code?: string } | undefined)?.code || "pcs"),
              lastBuy: Number(item.last_buy_price || 0),
              supplier: "Supplier tersimpan",
              active: Boolean(item.is_active),
            }))
          );
        }
        if (data.receivables) {
          setReceivables(
            data.receivables.map((item) => ({
              id: String(item.id),
              customer: String(
                (item.parties as { name?: string } | undefined)?.name || "Pelanggan"
              ),
              invoice: String(item.transaction_id || ""),
              amount: Number(item.amount || 0),
              paid: Number(item.paid_amount || 0),
              due: String(item.due_date),
            }))
          );
        }
        if (data.expenses) {
          setExpenses(
            data.expenses.map((item) => ({
              id: String(item.id),
              date: String(item.expense_date),
              category: String(item.category),
              amount: Number(item.amount || 0),
              note: String(item.notes || ""),
              type: String(item.expense_type || "OPERATING") as Expense["type"],
            }))
          );
        }
        if (data.batches) {
          const outputsByBatch = new Map<string, Array<{ name: string; qty: number }>>();
          if (data.batchOutputs) {
            for (const o of data.batchOutputs) {
              const bid = String(o.batch_id);
              if (!outputsByBatch.has(bid)) outputsByBatch.set(bid, []);
              outputsByBatch.get(bid)!.push({
                name: String((o.items as { name?: string } | undefined)?.name || "Produk"),
                qty: Number(o.qty || 0),
              });
            }
          }
          setBatches(
            data.batches.map((item) => {
              const outs = outputsByBatch.get(String(item.id));
              const product =
                outs && outs.length > 1
                  ? outs.map((o) => `${o.name} ${o.qty}`).join(", ")
                  : String((item.items as { name?: string } | undefined)?.name || "Produk");
              return {
                id: String(item.id),
                code: String(item.batch_code),
                date: String(item.produced_at).slice(0, 10),
                product,
                qty: Number(item.output_qty || 0),
                cogs: Number(item.cogs_per_unit || 0),
              };
            })
          );
        }
        if (data.capitalEntries) {
          setCapitalEntries(
            data.capitalEntries.map((item) => ({
              id: String(item.id),
              date: String(item.entry_date),
              type: String(item.entry_type) as CapitalEntry["type"],
              amount: Number(item.amount || 0),
              notes: String(item.notes || ""),
            }))
          );
        }
        if (data.payables) {
          setPayables(
            data.payables.map((item) => ({
              id: String(item.id),
              date: String(item.updated_at || "").slice(0, 10),
              supplier: String((item.parties as { name?: string } | undefined)?.name || "Supplier"),
              total: Number(item.amount || 0),
              paid: Number(item.paid_amount || 0),
              remaining: Number(item.amount || 0) - Number(item.paid_amount || 0),
              status: String(item.status) as Purchase["status"],
            }))
          );
        }
        if (data.purchases) {
          setPurchases(
            data.purchases.map((item) => {
              const payable = data.payables?.find(
                (entry) => String(entry.transaction_id) === String(item.id)
              );
              const total = Number(item.total || 0);
              const paid = payable ? Number(payable.paid_amount || 0) : Number(item.paid_amount || 0);
              return {
                id: String(item.id),
                payableId: payable ? String(payable.id) : undefined,
                date: String(item.occurred_at || "").slice(0, 10),
                supplier: String(
                  (item.parties as { name?: string } | undefined)?.name || "Supplier"
                ),
                total,
                paid,
                remaining: Math.max(0, total - paid),
                status: paid >= total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM_LUNAS",
              } as Purchase;
            })
          );
        }
        if (data.sales) {
          setSales(
            data.sales.map((item) => ({
              id: String(item.id),
              date: String(item.occurred_at || "").slice(0, 10),
              total: Number(item.total || 0),
              cogs: 0,
            }))
          );
        }
        const mapParty = (item: Record<string, unknown>): Party => ({
          id: String(item.id),
          name: String(item.name),
          type: String(item.party_type) === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER",
          kind:
            String(item.party_type) === "SUPPLIER"
              ? null
              : String(item.customer_kind) === "MITRA"
                ? "MITRA"
                : "RETAIL",
          phone: String(item.phone || ""),
          address: String(item.address || ""),
          creditLimit: Number(item.credit_limit || 0),
        });
        if (data.customers || data.suppliers) {
          setParties([
            ...(data.customers || []).map(mapParty),
            ...(data.suppliers || []).map(mapParty),
          ]);
        }
        if (data.supplierReturns) {
          setSupplierReturns(
            data.supplierReturns.map((item) => ({
              id: String(item.id),
              purchaseId: String(item.purchase_id),
              supplier: String(
                (item.parties as { name?: string } | undefined)?.name || "Supplier"
              ),
              date: String(item.return_date),
              reason: String(item.reason || ""),
              total: Number(item.total || 0),
              notes: String(item.notes || ""),
            }))
          );
        }
        if (data.cashReconciliations) {
          setCashRecons(
            data.cashReconciliations.map((item) => ({
              id: String(item.id),
              date: String(item.reconciliation_date),
              systemCash: Number(item.system_cash || 0),
              physicalCash: Number(item.physical_cash || 0),
              difference: Number(item.difference || 0),
              notes: String(item.notes || ""),
              status: String(item.status || "open") as CashRecon["status"],
            }))
          );
        }
      })
      .catch(() => undefined);

    // B2B data
    backendRequest<unknown[]>("/api/b2b/sales-orders")
      .then((rows) => {
        setB2bOrders(
          (rows as Record<string, unknown>[]).map((row) => {
            const party = row.parties as { name?: string; phone?: string } | undefined;
            const items = (
              (row.sales_order_items as Array<Record<string, unknown>>) || []
            ).map((it) => {
              const item = it.items as { name?: string; units?: { code?: string } } | undefined;
              return {
                id: String(it.id),
                item_id: String(it.item_id),
                qty: Number(it.qty),
                unit_price: Number(it.unit_price),
                subtotal: Number(it.subtotal),
                item_name: item?.name || "",
                unit_code: item?.units?.code || "",
              };
            });
            return {
              id: String(row.id),
              customer_id: String(row.customer_id),
              customer_name: party?.name || "",
              customer_phone: party?.phone || "",
              order_date: String(row.order_date),
              status: String(row.status) as SalesOrder["status"],
              payment_terms_days: Number(row.payment_terms_days),
              total_amount: Number(row.total_amount),
              notes: String(row.notes || ""),
              items,
            };
          })
        );
      })
      .catch(() => undefined);

    backendRequest<unknown[]>("/api/b2b/delivery-orders")
      .then((rows) => {
        setB2bDeliveries(
          (rows as Record<string, unknown>[]).map((row) => {
            const so = row.sales_orders as
              | { order_date?: string; parties?: { name?: string } }
              | undefined;
            const items = (
              (row.delivery_order_items as Array<Record<string, unknown>>) || []
            ).map((it) => {
              const item = it.items as { name?: string; units?: { code?: string } } | undefined;
              return {
                id: String(it.id),
                item_id: String(it.item_id),
                qty: Number(it.qty),
                item_name: item?.name || "",
                unit_code: item?.units?.code || "",
              };
            });
            return {
              id: String(row.id),
              sales_order_id: String(row.sales_order_id),
              customer_name: so?.parties?.name || "",
              so_date: so?.order_date || "",
              delivery_date: String(row.delivery_date),
              status: String(row.status) as DeliveryOrder["status"],
              notes: String(row.notes || ""),
              driver_name: String(row.driver_name || ""),
              items,
            };
          })
        );
      })
      .catch(() => undefined);

    backendRequest<unknown[]>("/api/b2b/invoices")
      .then((rows) => {
        setB2bInvoices(
          (rows as Record<string, unknown>[]).map((row) => {
            const so = row.sales_orders as
              | { order_date?: string; parties?: { name?: string; phone?: string } }
              | undefined;
            return {
              id: String(row.id),
              sales_order_id: String(row.sales_order_id),
              delivery_order_id: row.delivery_order_id ? String(row.delivery_order_id) : undefined,
              invoice_number: String(row.invoice_number),
              invoice_date: String(row.invoice_date),
              due_date: String(row.due_date),
              total_amount: Number(row.total_amount),
              paid_amount: Number(row.paid_amount),
              status: String(row.status) as Invoice["status"],
              notes: String(row.notes || ""),
              customer_name: so?.parties?.name || "",
            };
          })
        );
      })
      .catch(() => undefined);

    backendRequest<unknown[]>("/api/b2b/aging")
      .then((rows) => {
        setB2bAging(
          (rows as Record<string, unknown>[]).map((row) => ({
            invoice_id: String(row.invoice_id),
            invoice_number: String(row.invoice_number),
            customer_name: String(row.customer_name),
            invoice_date: String(row.invoice_date),
            due_date: String(row.due_date),
            total_amount: Number(row.total_amount),
            paid_amount: Number(row.paid_amount),
            outstanding: Number(row.outstanding),
            days_overdue: Number(row.days_overdue),
            age_bucket: String(row.age_bucket),
          }))
        );
      })
      .catch(() => undefined);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const dueReceivables = receivables.reduce(
    (sum, item) => sum + Math.max(0, item.amount - item.paid),
    0
  );

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing)
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      return [...current, { ...product, qty: 1 }];
    });
  };

  const changeCartQty = (id: string, delta: number) => {
    setCart((current) =>
      current.flatMap((item) =>
        item.id === id
          ? item.qty + delta <= 0
            ? []
            : [{ ...item, qty: item.qty + delta }]
          : [item]
      )
    );
  };

  const openCreate = (
    kind:
      | "product"
      | "material"
      | "expense"
      | "production"
      | "purchase"
      | "capital"
      | "party"
      | "b2b-order"
      | "b2b-delivery"
      | "b2b-invoice"
      | "return"
      | "cash-recon"
  ) => setModal(kind);

  const saveBusinessProfile = async (profile: BusinessProfile) => {
    try {
      await backendRequest("/api/business/profile", {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Profil usaha gagal disimpan.", "error");
      throw error;
    }
    setBusinessProfile(profile);
    setBusinessName(profile.name);
    notify("Profil usaha berhasil disimpan.");
  };

  const handlePayment = async (
    method: PaymentMethod,
    cash: number,
    customer: string,
    dueDate: string,
    override: string,
    discountValue: number
  ) => {
    if (!cart.length) return notify("Keranjang masih kosong.", "error");
    if (plan.name !== "PRO" && salesCount >= plan.salesLimit)
      return notify(
        `Batas ${plan.salesLimit} transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.`,
        "error"
      );
    const shortage = cart.filter((item) => item.qty > item.stock);
    if (shortage.length && (!override || override.trim().length < 5))
      return notify(
        `Stok ${shortage[0].name} tidak mencukupi. Alasan override minimal 5 karakter.`,
        "error"
      );
    const subtotal = cartTotal;
    const finalDiscount = Math.max(0, Math.min(discountValue, subtotal));
    const total = subtotal - finalDiscount;
    if (method === "TUNAI" && cash < total)
      return notify(`Pembayaran kurang ${rupiah(total - cash)}.`, "error");
    if (method === "HUTANG" && (!customer || !dueDate))
      return notify("Pilih pelanggan dan tanggal jatuh tempo untuk penjualan hutang.", "error");

    const saleId = `TRX-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${String(salesCount + 1).padStart(3, "0")}`;
    const paid = method === "TUNAI" ? cash : method === "HUTANG" ? 0 : total;
    const change = method === "TUNAI" ? cash - total : 0;

    try {
      await backendRequest("/api/pos/checkout", {
        method: "POST",
        body: JSON.stringify({
          payment_method: method,
          customer_name: customer,
          due_date: dueDate,
          paid_amount: paid,
          discount: finalDiscount,
          override_reason: override || null,
          items: cart.map((item) => ({
            item_id: item.id,
            qty: item.qty,
            unit_price: item.price,
          })),
        }),
      });
    } catch (error) {
      return notify(
        error instanceof Error ? error.message : "Transaksi gagal diproses.",
        "error"
      );
    }

    setProducts((current) =>
      current.map((product) => {
        const sold = cart.find((item) => item.id === product.id);
        return sold ? { ...product, stock: product.stock - sold.qty } : product;
      })
    );
    setSales((current) => [
      {
        id: saleId,
        date: new Date().toISOString().slice(0, 10),
        total,
        cogs: cart.reduce((sum, item) => sum + item.cogs * item.qty, 0),
      },
      ...current,
    ]);
    if (method === "HUTANG") {
      setReceivables((current) => [
        {
          id: `r-${Date.now()}`,
          customer,
          invoice: saleId,
          amount: total,
          paid: 0,
          due: dueDate,
        },
        ...current,
      ]);
    }
    setSalesCount((count) => count + 1);
    setLastSale({
      id: saleId,
      subtotal,
      discount: finalDiscount,
      total,
      method,
      paid,
      change,
      items: cart,
    });
    setCart([]);
    setDiscount(0);
    setModal("receipt");
  };

  const saveProduct = async (
    event: FormEvent<HTMLFormElement>,
    kind: "product" | "material"
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const unit = String(form.get("unit") || "");
    const stock = Number(form.get("stock") || 0);
    const price = Number(form.get("price") || 0);

    if (!name) return notify("Nama item wajib diisi.", "error");
    if (!unit) return notify("Pilih satuan item terlebih dahulu.", "error");
    if (stock < 0 || price < 0)
      return notify("Nilai stok dan harga tidak boleh kurang dari 0.", "error");
    if (kind === "product" && plan.name !== "PRO" && products.length >= plan.productLimit)
      return notify(
        `Batas ${plan.productLimit} produk paket Gratis telah tercapai. Upgrade ke PRO untuk menambah produk.`,
        "error"
      );
    if (kind === "material" && plan.name !== "PRO" && materials.length >= plan.materialLimit)
      return notify(
        `Batas ${plan.materialLimit} bahan baku paket Gratis telah tercapai. Upgrade ke PRO untuk menambah bahan.`,
        "error"
      );

    try {
      await backendRequest("/api/items", {
        method: "POST",
        body: JSON.stringify({
          name,
          unit_code: unit,
          stock_qty: stock,
          sale_price: kind === "product" ? price : 0,
          last_buy_price: kind === "material" ? price : 0,
          category: String(form.get("category") || "Lainnya"),
          item_type: kind === "product" ? "PRODUCT" : "RAW_MATERIAL",
        }),
      });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Item gagal disimpan.", "error");
    }

    if (kind === "product") {
      setProducts((current) => [
        {
          id: `p-${Date.now()}`,
          name,
          category: String(form.get("category") || "Lainnya"),
          stock,
          unit,
          price,
          cogs: 0,
          emoji: initials(name),
          active: true,
        },
        ...current,
      ]);
      notify("Produk baru berhasil ditambahkan.");
    } else {
      setMaterials((current) => [
        {
          id: `m-${Date.now()}`,
          name,
          stock,
          unit,
          lastBuy: price,
          supplier: String(form.get("supplier") || "Belum ada supplier"),
          active: true,
        },
        ...current,
      ]);
      notify("Bahan baku baru berhasil ditambahkan.");
    }
    setModal(null);
  };

  const createParty = async (
    name: string,
    type: Party["type"],
    details: Partial<Pick<Party, "phone" | "address" | "creditLimit" | "kind">> = {}
  ) => {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const kind = type === "SUPPLIER" ? null : details.kind === "MITRA" ? "MITRA" : "RETAIL";
    const existing = parties.find(
      (p) => p.type === type && p.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) return existing;

    let id = `pt-${Date.now()}`;
    try {
      const rows = await backendRequest<Array<{ id: string }>>("/api/parties", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
          party_type: type,
          customer_kind: kind,
          phone: details.phone || "",
          address: details.address || "",
          credit_limit: details.creditLimit || 0,
        }),
      });
      if (rows?.[0]?.id) id = String(rows[0].id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Data kontak gagal disimpan.", "error");
      return null;
    }

    const party: Party = {
      id,
      name: cleanName,
      type,
      kind,
      phone: details.phone || "",
      address: details.address || "",
      creditLimit: details.creditLimit || 0,
    };
    setParties((current) => [party, ...current]);
    return party;
  };

  const saveParty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const rawType = String(form.get("partyType") || "CUSTOMER");
    const type: Party["type"] = rawType === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER";
    const kind = rawType === "MITRA" ? "MITRA" : rawType === "SUPPLIER" ? null : "RETAIL";
    const creditLimit = Number(form.get("creditLimit") || 0);

    if (!name) return notify("Nama kontak wajib diisi.", "error");
    if (creditLimit < 0) return notify("Limit piutang tidak boleh negatif.", "error");

    await createParty(name, type, {
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
      creditLimit,
      kind,
    });
    setModal(null);
    notify(
      type === "SUPPLIER"
        ? "Supplier baru berhasil ditambahkan."
        : kind === "MITRA"
          ? "Mitra B2B baru berhasil ditambahkan."
          : "Pelanggan baru berhasil ditambahkan."
    );
  };

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    if (!form.get("category") || amount <= 0 || !form.get("date"))
      return notify("Kategori, nominal, dan tanggal wajib diisi dengan benar.", "error");
    const type = String(form.get("expenseType") || "OPERATING") as Expense["type"];

    try {
      await backendRequest("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          category: String(form.get("category")),
          amount,
          expense_date: String(form.get("date")),
          expense_type: type,
          notes: String(form.get("note") || ""),
        }),
      });
    } catch (error) {
      return notify(
        error instanceof Error ? error.message : "Pengeluaran gagal disimpan.",
        "error"
      );
    }

    setExpenses((current) => [
      {
        id: `e-${Date.now()}`,
        date: String(form.get("date")),
        category: String(form.get("category")),
        amount,
        note: String(form.get("note") || ""),
        type,
      },
      ...current,
    ]);
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

    const outputs = outputIds
      .map((id, i) => ({ product: products.find((item) => item.id === id), qty: outputQtys[i] }))
      .filter((o) => o.product && o.qty > 0);
    const rows = materialIds.map((id, index) => ({
      material: materials.find((item) => item.id === id),
      qty: materialQtys[index],
    }));

    if (!outputs.length || !rows.length || rows.some((row) => !row.material || row.qty <= 0))
      return notify("Pilih minimal satu output dan satu bahan dengan kuantitas valid.", "error");
    if (rows.some((row) => row.material!.stock < row.qty))
      return notify("Stok salah satu bahan baku tidak mencukupi untuk produksi ini.", "error");

    const materialCost = rows.reduce(
      (sum, row) => sum + row.qty * row.material!.lastBuy,
      0
    );
    const totalOutputQty = outputs.reduce((sum, o) => sum + o.qty, 0);
    const cogs =
      Math.round(((materialCost + Math.max(0, otherCost)) / totalOutputQty) * 100) / 100;

    try {
      await backendRequest("/api/production/batch", {
        method: "POST",
        body: JSON.stringify({
          outputs: outputs.map((o) => ({ item_id: o.product!.id, qty: o.qty })),
          other_cost: otherCost,
          materials: rows.map((row) => ({ item_id: row.material!.id, qty_used: row.qty })),
        }),
      });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Batch gagal disimpan.", "error");
    }

    setMaterials((current) =>
      current.map((item) => {
        const row = rows.find((candidate) => candidate.material!.id === item.id);
        return row ? { ...item, stock: item.stock - row.qty } : item;
      })
    );
    setProducts((current) =>
      current.map((item) => {
        const out = outputs.find((o) => o.product!.id === item.id);
        return out ? { ...item, stock: item.stock + out.qty, cogs } : item;
      })
    );
    const outLabel = outputs.map((o) => `${o.product!.name} ${o.qty}`).join(", ");
    setBatches((current) => [
      {
        id: `bt-${Date.now()}`,
        code: `BATCH-${new Date().toISOString().slice(0, 10).replaceAll("-", "").slice(2)}-${String(
          current.length + 1
        ).padStart(3, "0")}`,
        date: new Date().toISOString().slice(0, 10),
        product: outLabel,
        qty: totalOutputQty,
        cogs,
      },
      ...current,
    ]);
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

    if (!material || qty <= 0 || price < 0 || paid < 0 || !form.get("supplier"))
      return notify("Supplier, bahan, kuantitas, dan harga wajib diisi dengan benar.", "error");

    const total = qty * price;
    if (paid > total) return notify("Pembayaran awal tidak boleh melebihi total.", "error");
    const status = paid >= total ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM_LUNAS";

    let payableId: string | undefined;
    try {
      const result = await backendRequest<{ payable_id?: string }>("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplier_name: String(form.get("supplier")),
          payment_status: status,
          paid_amount: paid,
          payment_method: String(form.get("paymentMethod") || "TUNAI"),
          items: [{ item_id: materialId, qty, price }],
        }),
      });
      payableId = result.payable_id;
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Pembelian gagal disimpan.", "error");
    }

    setMaterials((current) =>
      current.map((item) =>
        item.id === material.id
          ? {
              ...item,
              stock: item.stock + qty,
              lastBuy: price,
              supplier: String(form.get("supplier")),
            }
          : item
      )
    );
    const purchase: Purchase = {
      id: `b-${Date.now()}`,
      payableId,
      date: new Date().toISOString().slice(0, 10),
      supplier: String(form.get("supplier")),
      total,
      paid,
      remaining: total - paid,
      status,
    };
    setPurchases((current) => [purchase, ...current]);
    setPayables((current) => (status === "LUNAS" ? current : [purchase, ...current]));
    setModal(null);
    notify(`Pembelian ${rupiah(total)} berhasil dicatat.`);
  };

  const saveCapital = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    const type = String(form.get("type")) as CapitalEntry["type"];
    const date = String(form.get("date") || "");

    if (!amount || amount <= 0 || !date)
      return notify("Jenis, nominal, dan tanggal modal wajib diisi.", "error");

    try {
      await backendRequest("/api/capital", {
        method: "POST",
        body: JSON.stringify({
          entry_type: type,
          amount,
          entry_date: date,
          notes: String(form.get("note") || ""),
        }),
      });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Modal gagal disimpan.", "error");
    }

    setCapitalEntries((current) => [
      {
        id: `c-${Date.now()}`,
        date,
        type,
        amount,
        notes: String(form.get("note") || ""),
      },
      ...current,
    ]);
    setModal(null);
    notify("Transaksi modal / prive berhasil dicatat.");
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

    if (!purchaseId || !material || qty <= 0)
      return notify("Pembelian, bahan, dan kuantitas retur wajib diisi.", "error");

    const total = qty * material.lastBuy;
    try {
      await backendRequest("/api/supplier-returns", {
        method: "POST",
        body: JSON.stringify({
          purchase_id: purchaseId,
          supplier_id: supplierId || null,
          reason,
          notes,
          items: [{ item_id: materialId, qty }],
        }),
      });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Retur gagal disimpan.", "error");
    }

    const supplier = parties.find((p) => p.id === supplierId)?.name || "Supplier";
    setSupplierReturns((current) => [
      {
        id: `rt-${Date.now()}`,
        purchaseId,
        supplier,
        date: new Date().toISOString().slice(0, 10),
        reason,
        total,
        notes,
      },
      ...current,
    ]);
    setMaterials((current) =>
      current.map((item) =>
        item.id === materialId ? { ...item, stock: item.stock - qty } : item
      )
    );
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

    try {
      await backendRequest("/api/cash-reconciliation", {
        method: "POST",
        body: JSON.stringify({
          reconciliation_date: date,
          system_cash: systemCash,
          physical_cash: physicalCash,
          notes,
        }),
      });
    } catch (error) {
      return notify(
        error instanceof Error ? error.message : "Rekonsiliasi gagal disimpan.",
        "error"
      );
    }

    setCashRecons((current) => [
      {
        id: `cr-${Date.now()}`,
        date,
        systemCash,
        physicalCash,
        difference,
        notes,
        status: "open",
      },
      ...current.filter((item) => item.date !== date),
    ]);
    setModal(null);
    notify(
      difference === 0
        ? "Kas seimbang. Rekonsiliasi tersimpan."
        : `Rekonsiliasi tersimpan. Selisih ${rupiah(difference)}.`
    );
  };

  const saveB2BOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("customer") || "").trim();
    const terms = Number(form.get("paymentTerms") || 30);
    const notes = String(form.get("notes") || "");
    const itemIds = form.getAll("itemId").map(String);
    const itemQtys = form.getAll("itemQty").map(Number);
    const itemPrices = form.getAll("itemPrice").map(Number);

    if (!customerName) return notify("Pilih atau isi nama pelanggan.", "error");
    const items = itemIds
      .map((id, i) => ({ item_id: id, qty: itemQtys[i], unit_price: itemPrices[i] }))
      .filter((it) => it.item_id && it.qty > 0);
    if (!items.length) return notify("Tambah minimal satu item.", "error");

    let customer = parties.find(
      (p) => p.type === "CUSTOMER" && p.name.toLowerCase() === customerName.toLowerCase()
    );
    if (!customer) {
      const created = await createParty(customerName, "CUSTOMER", { kind: "MITRA" });
      if (!created) return;
      customer = created;
    }

    try {
      const result = await backendRequest<{ id?: string }>("/api/b2b/sales-orders", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customer.id,
          customer_name: customer.name,
          payment_terms_days: terms,
          notes,
          items,
        }),
      });
      const soId = result?.id || `so-${Date.now()}`;
      const newOrder: SalesOrder = {
        id: soId,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone || "",
        order_date: new Date().toISOString().slice(0, 10),
        status: "DRAFT",
        payment_terms_days: terms,
        total_amount: items.reduce((s, it) => s + it.qty * it.unit_price, 0),
        notes,
        items: items.map((it, i) => ({
          id: `soi-${Date.now()}-${i}`,
          ...it,
          subtotal: it.qty * it.unit_price,
          item_name: products.find((p) => p.id === it.item_id)?.name || "",
        })),
      };
      setB2bOrders((prev) => [newOrder, ...prev]);
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Gagal membuat sales order.", "error");
    }

    setModal(null);
    notify("Sales order berhasil dibuat.");
  };

  const confirmB2BOrder = async (id: string) => {
    try {
      await backendRequest(`/api/b2b/sales-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Gagal konfirmasi SO.", "error");
    }
    setB2bOrders((prev) =>
      prev.map((so) => (so.id === id ? { ...so, status: "CONFIRMED" } : so))
    );
    notify("Sales order dikonfirmasi.");
  };

  const createB2BDelivery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const soId = String(form.get("salesOrderId") || "");
    const driverName = String(form.get("driverName") || "");
    const notes = String(form.get("notes") || "");

    if (!soId) return notify("Pilih sales order.", "error");

    try {
      const result = await backendRequest<{ id?: string }>("/api/b2b/delivery-orders", {
        method: "POST",
        body: JSON.stringify({ sales_order_id: soId, driver_name: driverName, notes }),
      });
      const so = b2bOrders.find((o) => o.id === soId);
      const newDO: DeliveryOrder = {
        id: result?.id || `do-${Date.now()}`,
        sales_order_id: soId,
        customer_name: so?.customer_name,
        so_date: so?.order_date,
        delivery_date: new Date().toISOString().slice(0, 10),
        status: "PENDING",
        notes,
        driver_name: driverName,
        items:
          so?.items.map((it) => ({
            id: `doi-${Date.now()}`,
            item_id: it.item_id,
            qty: it.qty,
            item_name: it.item_name,
            unit_code: it.unit_code,
          })) || [],
      };
      setB2bDeliveries((prev) => [newDO, ...prev]);
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Gagal membuat surat jalan.", "error");
    }

    setModal(null);
    notify("Surat jalan berhasil dibuat.");
  };

  const deliverB2BOrder = async (doId: string, soId: string) => {
    try {
      await backendRequest(`/api/b2b/sales-orders/${soId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DELIVERED" }),
      });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Gagal update status.", "error");
    }
    setB2bDeliveries((prev) =>
      prev.map((d) => (d.id === doId ? { ...d, status: "DELIVERED" } : d))
    );
    setB2bOrders((prev) =>
      prev.map((so) => (so.id === soId ? { ...so, status: "DELIVERED" } : so))
    );
    notify("Pengiriman dikonfirmasi diterima.");
  };

  const createB2BInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const soId = String(form.get("salesOrderId") || "");
    if (!soId) return notify("Pilih sales order.", "error");

    try {
      const result = await backendRequest<{
        id?: string;
        invoice_number?: string;
        due_date?: string;
        total_amount?: number;
      }>("/api/b2b/invoices", {
        method: "POST",
        body: JSON.stringify({ sales_order_id: soId }),
      });
      const so = b2bOrders.find((o) => o.id === soId);
      const newInv: Invoice = {
        id: result?.id || `inv-${Date.now()}`,
        sales_order_id: soId,
        invoice_number: result?.invoice_number || "",
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: result?.due_date || "",
        total_amount: result?.total_amount || so?.total_amount || 0,
        paid_amount: 0,
        status: "UNPAID",
        notes: "",
        customer_name: so?.customer_name,
      };
      setB2bInvoices((prev) => [newInv, ...prev]);
      setB2bOrders((prev) =>
        prev.map((o) => (o.id === soId ? { ...o, status: "INVOICED" } : o))
      );
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Gagal membuat invoice.", "error");
    }

    setModal(null);
    notify("Invoice berhasil diterbitkan.");
  };

  const openPayablePayment = (id: string) => {
    const payable = payables.find((item) => item.id === id);
    if (!payable || payable.remaining <= 0) return;
    setPartialPayment({
      kind: "payable",
      id,
      title: `Utang ke ${payable.supplier}`,
      remaining: payable.remaining,
    });
  };

  const openReceivablePayment = (id: string) => {
    const receivable = receivables.find((item) => item.id === id);
    if (!receivable) return;
    const remaining = receivable.amount - receivable.paid;
    if (remaining <= 0) return;
    setPartialPayment({
      kind: "receivable",
      id,
      title: `Piutang ${receivable.customer}`,
      remaining,
    });
  };

  const openInvoicePayment = (invoiceId: string) => {
    const invoice = b2bInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const remaining = invoice.total_amount - invoice.paid_amount;
    if (remaining <= 0) return;
    setPartialPayment({
      kind: "invoice",
      id: invoiceId,
      title: `Invoice ${invoice.invoice_number}`,
      remaining,
    });
  };

  const uploadPaymentProof = async (file: File | null) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    const result = await backendRequest<{ url: string }>("/api/upload/payment-proof", {
      method: "POST",
      body: formData,
    });
    return result.url;
  };

  const savePartialPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partialPayment) return;

    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    const paymentMethod = String(form.get("paymentMethod") || "TUNAI") as SettlementPaymentMethod;
    const notes = String(form.get("notes") || "");
    const file =
      form.get("proof") instanceof File && (form.get("proof") as File).size > 0
        ? (form.get("proof") as File)
        : null;

    if (!amount || amount <= 0 || amount > partialPayment.remaining)
      return notify("Nominal pembayaran tidak valid.", "error");

    try {
      const payment_proof_url = await uploadPaymentProof(file);
      const endpoint =
        partialPayment.kind === "payable"
          ? `/api/payables/${partialPayment.id}/pay`
          : partialPayment.kind === "receivable"
          ? `/api/receivables/${partialPayment.id}/pay`
          : `/api/b2b/invoices/${partialPayment.id}/pay`;
      await backendRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ amount, payment_method: paymentMethod, notes, payment_proof_url }),
      });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Pembayaran gagal disimpan.", "error");
    }

    if (partialPayment.kind === "payable") {
      setPayables((current) =>
        current.map((item) =>
          item.id === partialPayment.id
            ? {
                ...item,
                paid: item.paid + amount,
                remaining: item.remaining - amount,
                status: item.remaining - amount <= 0 ? "LUNAS" : "SEBAGIAN",
              }
            : item
        )
      );
      setPurchases((current) =>
        current.map((item) =>
          item.payableId === partialPayment.id
            ? {
                ...item,
                paid: item.paid + amount,
                remaining: item.remaining - amount,
                status: item.remaining - amount <= 0 ? "LUNAS" : "SEBAGIAN",
              }
            : item
        )
      );
    } else if (partialPayment.kind === "receivable") {
      setReceivables((current) =>
        current.map((item) =>
          item.id === partialPayment.id ? { ...item, paid: item.paid + amount } : item
        )
      );
    } else {
      setB2bInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== partialPayment.id) return inv;
          const newPaid = inv.paid_amount + amount;
          return {
            ...inv,
            paid_amount: newPaid,
            status: newPaid >= inv.total_amount ? "PAID" : "PARTIAL",
          };
        })
      );
    }

    setPartialPayment(null);
    notify(`Pembayaran ${rupiah(amount)} berhasil dicatat.`);
  };

  const sendWhatsApp = (phone: string, message: string) => {
    const clean = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    if (!clean) return notify("Nomor WhatsApp belum diisi.", "error");
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const exportReport = async () => {
    try {
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
        notify("Laporan CSV berhasil diunduh.");
      } else {
        notify("Gagal mengunduh laporan.", "error");
      }
    } catch {
      notify("Export laporan gagal.", "error");
    }
  };

  const resetAllData = async () => {
    const answer = window.prompt(
      "Semua data produk, transaksi, dan laporan akan dikosongkan. Ketik HAPUS untuk konfirmasi:"
    );
    if (!answer || answer.trim().toUpperCase() !== "HAPUS")
      return notify("Penghapusan dibatalkan.", "default");

    try {
      await backendRequest("/api/dev/reset", { method: "POST" });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Gagal mereset data.", "error");
    }
    setProducts([]);
    setMaterials([]);
    setReceivables([]);
    setExpenses([]);
    setPurchases([]);
    setPayables([]);
    setBatches([]);
    setCapitalEntries([]);
    setSales([]);
    setSalesCount(0);
    setCart([]);
    setLastSale(null);
    setDashboardData(null);
    notify("Semua data berhasil dikosongkan.");
  };

  const fillDummyData = async () => {
    if (!window.confirm("Muat data contoh? Data yang ada akan digantikan.")) return;
    try {
      await backendRequest("/api/dev/seed", { method: "POST" });
    } catch (error) {
      return notify(error instanceof Error ? error.message : "Gagal memuat data contoh.", "error");
    }
    notify("Data contoh berhasil dimuat. Memperbarui tampilan...");
    window.setTimeout(() => window.location.reload(), 900);
  };

  const importItems = async (file: File, kind: ImportKind) => {
    const formData = new FormData();
    formData.append("type", kind);
    formData.append("file", file);
    try {
      const result = await backendRequest<{ imported: number; updated?: number; type?: ImportKind }>(
        "/api/items/import",
        {
          method: "POST",
          body: formData,
        }
      );
      const actualKind = result.type || kind;
      const label = actualKind === "PRODUCT" ? "produk" : "bahan baku";
      const parts = [
        result.imported ? `${result.imported} ${label} baru` : "",
        result.updated ? `${result.updated} diperbarui` : "",
      ].filter(Boolean);
      notify(`${parts.join(", ") || label} berhasil diimpor. Memuat ulang data...`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Import file gagal.", "error");
    }
  };

  return (
    <div className={`app-shell ${dark ? "dark-mode" : ""}`}>
      <Sidebar
        view={view}
        navigate={navigate}
        onPlan={() => (window.location.href = "/pricing")}
        salesCount={salesCount}
        plan={plan}
        account={account}
      />

      <div className="main-area">
        <Topbar
          businessName={businessName}
          view={view}
          dark={dark}
          setDark={setDark}
          onOpenMobileMenu={() => setMobileSheetOpen(true)}
          onNotify={notify}
        />

        {view === "dashboard" && (
          <DashboardView
            products={products}
            materials={materials}
            expenses={expenses}
            receivables={receivables}
            sales={sales}
            salesCount={salesCount}
            dueReceivables={dueReceivables}
            dashboardData={dashboardData}
            plan={plan}
            businessName={businessName}
            navigate={navigate}
          />
        )}

        {view === "pos" && (
          <POSView
            products={products}
            cart={cart}
            total={cartTotal}
            discount={discount}
            onDiscountChange={setDiscount}
            onAdd={addToCart}
            onChangeQty={changeCartQty}
            onPay={() => setModal("payment")}
            onNewProduct={() => openCreate("product")}
          />
        )}

        {view === "products" && (
          <ProductsView
            products={products}
            onAdd={() => openCreate("product")}
            onNavigate={navigate}
            onImport={(file) => importItems(file, "PRODUCT")}
            onDownloadTemplate={() => downloadItemTemplate("PRODUCT")}
          />
        )}

        {view === "materials" && (
          <MaterialsView
            materials={materials}
            onAdd={() => openCreate("material")}
            onImport={(file) => importItems(file, "RAW_MATERIAL")}
            onDownloadTemplate={() => downloadItemTemplate("RAW_MATERIAL")}
          />
        )}

        {view === "production" && (
          <ProductionView
            batches={batches}
            products={products}
            materials={materials}
            onAdd={() => openCreate("production")}
          />
        )}

        {view === "purchases" && (
          <PurchasesView
            purchases={purchases}
            materials={materials}
            onAdd={() => openCreate("purchase")}
            onPay={openPayablePayment}
            onReturn={() => openCreate("return")}
          />
        )}

        {view === "parties" && (
          <PartiesView
            parties={parties}
            onAdd={() => openCreate("party")}
            onWhatsApp={sendWhatsApp}
          />
        )}

        {view === "receivables" && (
          <ReceivablesView receivables={receivables} onPay={openReceivablePayment} />
        )}

        {view === "expenses" && (
          <ExpensesView expenses={expenses} onAdd={() => openCreate("expense")} />
        )}

        {view === "cash-recon" && (
          <CashReconView recons={cashRecons} onAdd={() => openCreate("cash-recon")} />
        )}

        {view === "reports" && (
          <ReportsView
            expenses={expenses}
            capitalEntries={capitalEntries}
            purchases={purchases}
            receivables={receivables}
            products={products}
            sales={sales}
            exportReport={exportReport}
            onAddCapital={() => openCreate("capital")}
          />
        )}

        {view === "b2b-orders" && (
          <B2BOrdersView
            orders={b2bOrders}
            onAdd={() => openCreate("b2b-order")}
            onConfirm={confirmB2BOrder}
          />
        )}

        {view === "b2b-deliveries" && (
          <B2BDeliveriesView
            deliveries={b2bDeliveries}
            orders={b2bOrders}
            onAdd={() => openCreate("b2b-delivery")}
            onDeliver={deliverB2BOrder}
          />
        )}

        {view === "b2b-invoices" && (
          <B2BInvoicesView
            invoices={b2bInvoices}
            orders={b2bOrders}
            onAdd={() => openCreate("b2b-invoice")}
            onPay={openInvoicePayment}
          />
        )}

        {view === "b2b-aging" && <B2BAgingView aging={b2bAging} />}

        {view === "guide" && <GuideView role={account.role} />}

        {view === "settings" && (
          <SettingsView
            dark={dark}
            setDark={setDark}
            notify={notify}
            onReset={resetAllData}
            onSeed={fillDummyData}
            businessProfile={businessProfile}
            onSaveProfile={saveBusinessProfile}
            plan={plan}
          />
        )}

        <BottomNav
          view={view}
          navigate={navigate}
          role={account.role}
          onMenu={() => setMobileSheetOpen(true)}
        />
      </div>

      {modal === "product" && (
        <ItemModal kind="product" onClose={() => setModal(null)} onSave={saveProduct} />
      )}
      {modal === "material" && (
        <ItemModal kind="material" onClose={() => setModal(null)} onSave={saveProduct} />
      )}
      {modal === "expense" && (
        <ExpenseModal onClose={() => setModal(null)} onSave={saveExpense} />
      )}
      {modal === "production" && (
        <ProductionModal
          products={products}
          materials={materials}
          onClose={() => setModal(null)}
          onSave={saveProduction}
        />
      )}
      {modal === "purchase" && (
        <PurchaseModal
          materials={materials}
          suppliers={parties.filter((item) => item.type === "SUPPLIER").map((item) => item.name)}
          onCreateSupplier={async (name) => (await createParty(name, "SUPPLIER"))?.name ?? null}
          onClose={() => setModal(null)}
          onSave={savePurchase}
        />
      )}
      {modal === "capital" && (
        <CapitalModal onClose={() => setModal(null)} onSave={saveCapital} />
      )}
      {modal === "party" && <PartyModal onClose={() => setModal(null)} onSave={saveParty} />}
      {modal === "payment" && (
        <PaymentModal
          total={cartTotal}
          customers={parties.filter((item) => item.type === "CUSTOMER").map((item) => item.name)}
          onCreateCustomer={async (name) =>
            (await createParty(name, "CUSTOMER", { kind: "RETAIL" }))?.name ?? null
          }
          onClose={() => setModal(null)}
          onPay={handlePayment}
        />
      )}
      {modal === "receipt" && lastSale && (
        <ReceiptModal
          sale={lastSale}
          businessProfile={businessProfile}
          onClose={() => setModal(null)}
          onPrint={() =>
            notify("Struk dikirim ke printer. Jika gagal, gunakan tombol bagikan struk.", "default")
          }
        />
      )}
      {modal === "b2b-order" && (
        <B2BOrderModal
          customers={parties.filter((p) => p.type === "CUSTOMER")}
          products={products}
          onCreateCustomer={async (name) =>
            (await createParty(name, "CUSTOMER", { kind: "MITRA" }))?.name ?? null
          }
          onClose={() => setModal(null)}
          onSave={saveB2BOrder}
        />
      )}
      {modal === "b2b-delivery" && (
        <B2BDeliveryModal
          orders={b2bOrders.filter((so) => so.status === "CONFIRMED")}
          onClose={() => setModal(null)}
          onSave={createB2BDelivery}
        />
      )}
      {modal === "b2b-invoice" && (
        <B2BInvoiceModal
          orders={b2bOrders.filter((so) => so.status === "DELIVERED")}
          onClose={() => setModal(null)}
          onSave={createB2BInvoice}
        />
      )}
      {modal === "return" && (
        <SupplierReturnModal
          purchases={purchases}
          materials={materials}
          suppliers={parties.filter((p) => p.type === "SUPPLIER")}
          onClose={() => setModal(null)}
          onSave={saveSupplierReturn}
        />
      )}
      {modal === "cash-recon" && (
        <CashReconModal onClose={() => setModal(null)} onSave={saveCashReconciliation} />
      )}
      {partialPayment && (
        <PartialPaymentModal
          target={partialPayment}
          onClose={() => setPartialPayment(null)}
          onSave={savePartialPayment}
        />
      )}

      {toast && (
        <div className={`toast ${toast.tone}`} role="status">
          <Check size={16} />
          {toast.message}
        </div>
      )}

      {mobileSheetOpen && (
        <MobileNavSheet
          view={view}
          navigate={(v) => {
            navigate(v);
            setMobileSheetOpen(false);
          }}
          onClose={() => setMobileSheetOpen(false)}
          role={account.role}
        />
      )}
    </div>
  );
}
