export type UserRole = "OWNER" | "KASIR" | "GUDANG" | "FINANCE";

export type View =
  | "dashboard"
  | "pos"
  | "products"
  | "materials"
  | "production"
  | "purchases"
  | "parties"
  | "receivables"
  | "expenses"
  | "cash-recon"
  | "reports"
  | "b2b-orders"
  | "b2b-deliveries"
  | "b2b-invoices"
  | "b2b-aging"
  | "guide"
  | "settings";

export type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER" | "HUTANG";
export type SettlementPaymentMethod = Exclude<PaymentMethod, "HUTANG">;

export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  cogs: number;
  emoji: string;
  active: boolean;
};

export type Material = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  lastBuy: number;
  supplier: string;
  active: boolean;
};

export type CartItem = Product & { qty: number };

export type Receivable = {
  id: string;
  customer: string;
  invoice: string;
  amount: number;
  paid: number;
  due: string;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
  type?: "OPERATING" | "OWNER_WITHDRAWAL";
};

export type Purchase = {
  id: string;
  payableId?: string;
  date: string;
  supplier: string;
  total: number;
  paid: number;
  remaining: number;
  status: "LUNAS" | "SEBAGIAN" | "BELUM_LUNAS";
};

export type CapitalEntry = {
  id: string;
  date: string;
  type: "INITIAL" | "ADDITION" | "WITHDRAWAL";
  amount: number;
  notes: string;
};

export type CustomerKind = "RETAIL" | "MITRA";

export type Party = {
  id: string;
  name: string;
  type: "CUSTOMER" | "SUPPLIER";
  kind: CustomerKind | null;
  phone: string;
  address: string;
  creditLimit: number;
};

export type PnlReport = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  balance_sheet: {
    cash: number;
    inventory: number;
    receivables: number;
    payables: number;
    assets: number;
    equity: number;
  };
};

export type SaleSummary = {
  id: string;
  date: string;
  total: number;
  cogs: number;
};

export type Batch = {
  id: string;
  code: string;
  date: string;
  product: string;
  qty: number;
  cogs: number;
};

export type Toast = {
  message: string;
  tone: "success" | "error" | "default";
};

export type B2BOrderItem = {
  id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  item_name?: string;
  unit_code?: string;
};

export type SalesOrder = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  order_date: string;
  status: "DRAFT" | "CONFIRMED" | "DELIVERED" | "INVOICED" | "CANCELLED";
  payment_terms_days: number;
  total_amount: number;
  notes: string;
  items: B2BOrderItem[];
};

export type DeliveryOrder = {
  id: string;
  sales_order_id: string;
  customer_name?: string;
  so_date?: string;
  delivery_date: string;
  status: "PENDING" | "DELIVERED";
  notes: string;
  driver_name: string;
  items: Array<{
    id: string;
    item_id: string;
    qty: number;
    item_name?: string;
    unit_code?: string;
  }>;
};

export type Invoice = {
  id: string;
  sales_order_id: string;
  delivery_order_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
  notes: string;
  customer_name?: string;
  payments?: InvoicePayment[];
};

export type InvoicePayment = {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  notes: string;
};

export type AgingRow = {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  days_overdue: number;
  age_bucket: string;
};

export type SupplierReturn = {
  id: string;
  purchaseId: string;
  supplier: string;
  date: string;
  reason: string;
  total: number;
  notes: string;
};

export type CashRecon = {
  id: string;
  date: string;
  systemCash: number;
  physicalCash: number;
  difference: number;
  notes: string;
  status: "open" | "verified" | "disputed";
};

export type PartialPaymentTarget = {
  kind: "receivable" | "payable" | "invoice";
  id: string;
  title: string;
  remaining: number;
};

export type BusinessProfile = {
  name: string;
  phone: string;
  address: string;
  receipt_footer: string;
  paper_width: 58 | 80;
};

export type PlanState = {
  name: "FREE" | "PRO";
  salesLimit: number;
  productLimit: number;
  materialLimit: number;
};

export type DashboardData = {
  today: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  };
  plan: {
    salesCount: number;
    productCount: number;
    materialCount: number;
  };
  salesTrend?: Array<{ date: string; total: number }>;
  criticalMaterials: Array<{ id: string; name: string; stock: number; unit: string }>;
  dueReceivables: Array<{ customer: string; remaining: number; dueDate: string }>;
  recentActivity: {
    sales: Array<{ id: string; total: number; date: string; method: string }>;
    batches: Array<{ id: string; code: string; product: string; qty: number; cogs: number; date: string }>;
    purchases: Array<{ id: string; total: number; supplier: string; date: string }>;
  };
};

export type ImportKind = "PRODUCT" | "RAW_MATERIAL";

export type NavItem = {
  id: View;
  label: string;
  icon: any;
  badge?: string | number;
  badgeColor?: string;
  roles?: UserRole[];
};

export type NavSection = {
  label: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  roles?: UserRole[];
  items: NavItem[];
};
