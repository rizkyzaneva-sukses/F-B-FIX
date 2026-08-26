import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Leaf,
  Plus,
  ShoppingCart,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Kpi } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah, dateLabel } from "@/lib/format";
import type { DashboardData, Expense, Material, PlanState, Product, Receivable, SaleSummary, View } from "@/lib/types";

export function DashboardView({
  products,
  materials,
  expenses,
  receivables,
  sales,
  salesCount,
  dueReceivables,
  dashboardData,
  plan,
  businessName,
  navigate,
}: {
  products: Product[];
  materials: Material[];
  expenses: Expense[];
  receivables: Receivable[];
  sales: SaleSummary[];
  salesCount: number;
  dueReceivables: number;
  dashboardData: DashboardData | null;
  plan: PlanState;
  businessName: string;
  navigate: (view: View) => void;
}) {
  const critical = dashboardData?.criticalMaterials.length
    ? dashboardData.criticalMaterials
    : materials.filter((m) => m.stock <= 2);

  const totalRevenue = dashboardData?.today.revenue ?? sales.reduce((sum, item) => sum + item.total, 0);
  const totalExpenses = dashboardData?.today.expenses ?? expenses.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = dashboardData?.today.netProfit ?? (totalRevenue - totalExpenses);

  const fallbackTrend = [
    { day: "Sen", total: 420000 },
    { day: "Sel", total: 580000 },
    { day: "Rab", total: 390000 },
    { day: "Kam", total: 720000 },
    { day: "Jum", total: 890000 },
    { day: "Sab", total: 1150000 },
    { day: "Min", total: totalRevenue || 670000 },
  ];

  const maxVal = Math.max(...fallbackTrend.map((t) => t.total), 1);

  return (
    <main className="page">
      <PageHeading
        eyebrow="Ringkasan Operasional"
        title={`Halo, ${businessName}`}
        description="Pantau performa penjualan, ketersediaan bahan baku, dan tagihan aktif hari ini."
        action={
          <button className="button button-primary" onClick={() => navigate("pos")}>
            <ShoppingCart size={16} />
            Buka Kasir POS
          </button>
        }
      />

      <div className="kpi-grid">
        <Kpi
          label="Omzet Penjualan"
          value={rupiah(totalRevenue)}
          foot={
            <span className="positive">
              <ArrowUpRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
              {salesCount} transaksi tercatat
            </span>
          }
          icon={<TrendingUp size={16} />}
        />
        <Kpi
          label="Laba Bersih"
          value={rupiah(netProfit)}
          foot={<span>Setelah HPP & pengeluaran</span>}
          icon={<BarChart3 size={16} />}
        />
        <Kpi
          label="Piutang Tertagih"
          value={rupiah(dueReceivables)}
          foot={
            <span className={dueReceivables > 0 ? "negative" : ""}>
              {receivables.filter((r) => r.amount > r.paid).length} tagihan belum lunas
            </span>
          }
          icon={<WalletCards size={16} />}
          tone={dueReceivables > 0 ? "negative" : undefined}
        />
        <Kpi
          label="Bahan Kritis"
          value={`${critical.length} item`}
          foot={<span>Stok menipis / perlu restock</span>}
          icon={<Leaf size={16} />}
          tone={critical.length > 0 ? "negative" : undefined}
        />
      </div>

      <div className="dashboard-grid">
        <section className="card card-pad">
          <div className="section-header">
            <div>
              <h2>Tren Penjualan Mingguan</h2>
              <p>Performa omzet 7 hari terakhir</p>
            </div>
            <button className="section-link" onClick={() => navigate("reports")}>
              Laporan Lengkap &rarr;
            </button>
          </div>

          <div className="chart-wrap">
            {fallbackTrend.map((t, idx) => (
              <div
                key={t.day}
                className={`chart-column ${idx === fallbackTrend.length - 1 ? "today" : ""}`}
              >
                <div
                  className="chart-bar"
                  style={{ height: `${Math.max(12, Math.round((t.total / maxVal) * 160))}px` }}
                  title={`${t.day}: ${rupiah(t.total)}`}
                />
                <span className="chart-label">{t.day}</span>
                <span className="chart-value">{shortRupiah(t.total)}</span>
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: 24, marginBottom: 12 }}>
            <div>
              <h2>Aktivitas Transaksi Terbaru</h2>
              <p>Riwayat kasir dan penjualan</p>
            </div>
            <button className="section-link" onClick={() => navigate("pos")}>
              Ke POS &rarr;
            </button>
          </div>

          <div className="activity-list">
            {sales.slice(0, 5).map((s) => (
              <div className="activity-row" key={s.id}>
                <div className="status-dot" style={{ background: "var(--primary)" }} />
                <div className="row-main">
                  <strong>Penjualan {s.id}</strong>
                  <span>{dateLabel(s.date)}</span>
                </div>
                <span className="row-side positive">+ {rupiah(s.total)}</span>
              </div>
            ))}
            {!sales.length && (
              <p className="table-muted" style={{ padding: "12px 0", textAlign: "center" }}>
                Belum ada transaksi penjualan.
              </p>
            )}
          </div>
        </section>

        <div className="dashboard-stack">
          <section className="card card-pad">
            <div className="section-header">
              <div>
                <h2>Bahan Perlu Restock</h2>
                <p>Kuantitas di bawah batas aman</p>
              </div>
              <button className="section-link" onClick={() => navigate("materials")}>
                Kelola &rarr;
              </button>
            </div>

            <div className="alert-list">
              {critical.slice(0, 4).map((m) => (
                <div className="alert-row" key={m.id}>
                  <div className="status-dot red" />
                  <div className="row-main">
                    <strong>{m.name}</strong>
                    <span>
                      Tersisa {m.stock} {m.unit}
                    </span>
                  </div>
                  <button
                    className="button button-secondary"
                    style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }}
                    onClick={() => navigate("purchases")}
                  >
                    Beli
                  </button>
                </div>
              ))}
              {!critical.length && (
                <div className="callout success">
                  <div>
                    <strong>Stok Aman</strong>
                    <p>Semua bahan baku saat ini berada di atas batas minimum.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="card card-pad">
            <div className="section-header">
              <div>
                <h2>Aksi Cepat</h2>
                <p>Jalan pintas operasional</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <button
                className="button button-secondary"
                style={{ justifyContent: "flex-start" }}
                onClick={() => navigate("production")}
              >
                <Boxes size={16} />
                Mulai Batch Produksi Baru
              </button>
              <button
                className="button button-secondary"
                style={{ justifyContent: "flex-start" }}
                onClick={() => navigate("purchases")}
              >
                <Plus size={16} />
                Catat Pembelian Bahan
              </button>
              <button
                className="button button-secondary"
                style={{ justifyContent: "flex-start" }}
                onClick={() => navigate("cash-recon")}
              >
                <CircleDollarSign size={16} />
                Rekonsiliasi Kas Toko
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
