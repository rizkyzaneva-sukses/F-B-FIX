import {
  BarChart3,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Leaf,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { initials } from "@/lib/format";
import type { NavSection, PlanState, UserRole, View } from "@/lib/types";

export const navSections: NavSection[] = [
  {
    label: "Utama",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
      { id: "pos", label: "Kasir POS", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "KASIR"] },
    ],
  },
  {
    label: "Operasional & Stok",
    roles: ["OWNER", "MANAGER", "GUDANG"],
    items: [
      { id: "products", label: "Produk Jadi", icon: Package, roles: ["OWNER", "MANAGER", "GUDANG"] },
      { id: "materials", label: "Bahan Baku", icon: Leaf, roles: ["OWNER", "MANAGER", "GUDANG"] },
      { id: "production", label: "Produksi Batch", icon: Boxes, roles: ["OWNER", "MANAGER", "GUDANG"] },
      { id: "purchases", label: "Pembelian Bahan", icon: Truck, roles: ["OWNER", "MANAGER", "GUDANG"] },
      { id: "parties", label: "Kontak Bisnis", icon: Users, roles: ["OWNER", "MANAGER", "B2B_SALES"] },
    ],
  },
  {
    label: "Keuangan & Kas",
    roles: ["OWNER", "MANAGER", "FINANCE"],
    items: [
      { id: "receivables", label: "Piutang Usaha", icon: WalletCards, roles: ["OWNER", "MANAGER", "FINANCE"] },
      { id: "expenses", label: "Pengeluaran", icon: CircleDollarSign, roles: ["OWNER", "MANAGER", "FINANCE"] },
      { id: "cash-recon", label: "Rekonsiliasi Kas", icon: ClipboardList, roles: ["OWNER", "MANAGER", "FINANCE"] },
      { id: "reports", label: "Laporan Keuangan", icon: BarChart3, roles: ["OWNER", "MANAGER", "FINANCE"] },
    ],
  },
  {
    label: "B2B / Grosir",
    collapsible: true,
    defaultOpen: true,
    roles: ["OWNER", "MANAGER", "B2B_SALES", "FINANCE"],
    items: [
      { id: "b2b-orders", label: "Sales Order", icon: FileText, roles: ["OWNER", "MANAGER", "B2B_SALES"] },
      { id: "b2b-deliveries", label: "Surat Jalan", icon: Truck, roles: ["OWNER", "MANAGER", "B2B_SALES"] },
      { id: "b2b-invoices", label: "Invoice B2B", icon: Receipt, roles: ["OWNER", "MANAGER", "B2B_SALES", "FINANCE"] },
      { id: "b2b-aging", label: "Aging Piutang", icon: Clock3, roles: ["OWNER", "MANAGER", "B2B_SALES", "FINANCE"] },
    ],
  },
  {
    label: "Bantuan & Sistem",
    items: [
      { id: "guide", label: "Panduan", icon: BookOpen, roles: ["OWNER", "MANAGER", "KASIR", "GUDANG", "FINANCE", "B2B_SALES"] },
      { id: "settings", label: "Pengaturan", icon: Settings, roles: ["OWNER", "KASIR"] },
    ],
  },
];

export function Sidebar({
  view,
  navigate,
  onPlan,
  salesCount,
  plan,
  account,
}: {
  view: View;
  navigate: (view: View) => void;
  onPlan: () => void;
  salesCount: number;
  plan: PlanState;
  account: { name: string; role: UserRole };
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "B2B / Grosir": true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/login";
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">DK</div>
        <div>
          <span className="brand-name">DapurKasir</span>
          <span className="brand-sub">Operasional Kuliner</span>
        </div>
      </div>

      <nav aria-label="Navigasi utama" style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
        {navSections.map((section) => {
          // Check section role
          if (section.roles && !section.roles.includes(account.role)) {
            return null;
          }

          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(account.role)
          );

          if (!visibleItems.length) return null;

          const isCollapsible = section.collapsible;
          const isOpen = !isCollapsible || openGroups[section.label] !== false;

          return (
            <div className="nav-group" key={section.label} style={{ marginBottom: 12 }}>
              {isCollapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(section.label)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "4px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                  }}
                >
                  <span>{section.label}</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <div className="nav-label">{section.label}</div>
              )}

              {isOpen && (
                <div style={{ display: "grid", gap: 3, marginTop: 4 }}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = view === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`nav-item ${isActive ? "active" : ""}`}
                        onClick={() => navigate(item.id)}
                      >
                        <Icon size={17} />
                        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                        {item.badge && <span className="badge badge-amber">{item.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {account.role === "OWNER" && (
          <div className="plan-card">
            {plan.name === "PRO" ? (
              <>
                <span className="badge badge-green">PRO Plan</span>
                <strong>Transaksi Tanpa Batas</strong>
                <p>Semua fitur aktif untuk bisnis ini.</p>
              </>
            ) : (
              <>
                <span className="badge badge-emerald">Free Plan</span>
                <strong>
                  {salesCount} dari {plan.salesLimit} Transaksi
                </strong>
                <p>
                  {salesCount >= plan.salesLimit * 0.8
                    ? "Hampir mencapai batas bulanan."
                    : "Kuota operasional bulan ini."}
                </p>
                <button type="button" className="button button-primary" onClick={onPlan}>
                  Upgrade PRO <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        )}

        <div className="profile-chip">
          <div className="avatar">{initials(account.name)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {account.name}
            </strong>
            <span>
              {account.role === "KASIR"
                ? "Kasir"
                : account.role === "MANAGER"
                ? "Manager"
                : account.role === "GUDANG"
                ? "Gudang"
                : account.role === "FINANCE"
                ? "Finance"
                : account.role === "B2B_SALES"
                ? "B2B Sales"
                : "Owner"}
            </span>
          </div>
          <button
            type="button"
            className="icon-button"
            style={{ width: 32, height: 32, border: 0 }}
            aria-label="Keluar / Logout"
            title="Keluar"
            onClick={handleLogout}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
