import { BarChart3, Boxes, CircleDollarSign, FileDown, Plus, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { Kpi } from "@/components/ui/kpi-card";
import { rupiah } from "@/lib/format";
import { backendRequest } from "@/lib/client-api";
import type { CapitalEntry, Expense, PnlReport, Product, Purchase, Receivable, SaleSummary } from "@/lib/types";

export function ReportsView({
  expenses,
  capitalEntries,
  purchases,
  receivables,
  products,
  sales,
  exportReport,
  onAddCapital,
}: {
  expenses: Expense[];
  capitalEntries: CapitalEntry[];
  purchases: Purchase[];
  receivables: Receivable[];
  products: Product[];
  sales: SaleSummary[];
  exportReport: () => void;
  onAddCapital: () => void;
}) {
  const [tab, setTab] = useState<"pnl" | "cash" | "balance">("pnl");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${todayIso.slice(0, 7)}-01`);
  const [to, setTo] = useState(todayIso);
  const [server, setServer] = useState<PnlReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingReport(true);
    backendRequest<PnlReport>(`/api/reports/pnl?dateFrom=${from}&dateTo=${to}`)
      .then((data) => {
        if (!cancelled) setServer(data);
      })
      .catch(() => {
        if (!cancelled) setServer(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingReport(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const inRange = (date: string) => date >= from && date <= to;

  const localOperating = expenses
    .filter((item) => item.type !== "OWNER_WITHDRAWAL" && inRange(item.date))
    .reduce((sum, item) => sum + item.amount, 0);

  const ownerExpenses = expenses
    .filter((item) => item.type === "OWNER_WITHDRAWAL" && inRange(item.date))
    .reduce((sum, item) => sum + item.amount, 0);

  const localRevenue = sales.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.total, 0);
  const localCogs = sales.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.cogs, 0);

  const localCash =
    capitalEntries
      .filter((item) => inRange(item.date))
      .reduce((sum, item) => sum + (item.type === "WITHDRAWAL" ? -item.amount : item.amount), 0) +
    localRevenue -
    purchases.filter((item) => inRange(item.date)).reduce((sum, item) => sum + item.paid, 0) -
    localOperating -
    ownerExpenses;

  const revenue = server?.revenue ?? localRevenue;
  const cogs = server?.cogs ?? localCogs;
  const operating = server?.expenses ?? localOperating;
  const net = server?.net_profit ?? revenue - cogs - operating;
  const cash = server?.balance_sheet.cash ?? localCash;
  const inventory =
    server?.balance_sheet.inventory ??
    products.reduce((sum, item) => sum + item.stock * item.cogs, 0);
  const receivableBalance =
    server?.balance_sheet.receivables ??
    receivables.reduce((sum, item) => sum + item.amount - item.paid, 0);
  const payableBalance =
    server?.balance_sheet.payables ?? purchases.reduce((sum, item) => sum + item.remaining, 0);
  const withdrawals =
    capitalEntries
      .filter((item) => item.type === "WITHDRAWAL" && inRange(item.date))
      .reduce((sum, item) => sum + item.amount, 0) + ownerExpenses;

  return (
    <main className="page">
      <PageHeading
        eyebrow="Keuangan"
        title="Laporan Keuangan Terpadu"
        description="Laba rugi, arus kas riil, neraca aset-kewajiban, dan catatan modal."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button button-secondary" onClick={onAddCapital}>
              <Plus size={16} />
              Modal / Prive
            </button>
            <button className="button button-secondary" onClick={exportReport}>
              <FileDown size={16} />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="toolbar" style={{ marginTop: 10 }}>
        <div className="field">
          <label>Dari Tanggal</label>
          <input
            className="input"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="field">
          <label>Sampai Tanggal</label>
          <input
            className="input"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <div className="category-row" style={{ marginTop: 16 }}>
        <button
          className={`category-chip ${tab === "pnl" ? "active" : ""}`}
          onClick={() => setTab("pnl")}
        >
          Laba Rugi (P&L)
        </button>
        <button
          className={`category-chip ${tab === "cash" ? "active" : ""}`}
          onClick={() => setTab("cash")}
        >
          Arus Kas (Cash Flow)
        </button>
        <button
          className={`category-chip ${tab === "balance" ? "active" : ""}`}
          onClick={() => setTab("balance")}
        >
          Neraca (Balance Sheet)
        </button>
      </div>

      {tab === "pnl" && (
        <>
          <div className="kpi-grid" style={{ marginTop: 16 }}>
            <Kpi
              label="Total Omzet"
              value={rupiah(revenue)}
              foot={<span>Penjualan periode</span>}
              icon={<TrendingUp size={16} />}
            />
            <Kpi
              label="HPP / COGS"
              value={rupiah(cogs)}
              foot={<span>Biaya pokok barang terjual</span>}
              icon={<Boxes size={16} />}
            />
            <Kpi
              label="Laba Kotor"
              value={rupiah(revenue - cogs)}
              foot={
                <span>
                  Margin {revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 100) : 0}%
                </span>
              }
              icon={<TrendingUp size={16} />}
            />
            <Kpi
              label="Beban Operasional"
              value={rupiah(operating)}
              foot={<span>Beban di luar prive</span>}
              icon={<CircleDollarSign size={16} />}
            />
            <Kpi
              label="Laba Bersih"
              value={rupiah(net)}
              foot={<span>{loadingReport ? "Memuat..." : "Laba bersih final"}</span>}
              icon={<BarChart3 size={16} />}
              tone={net >= 0 ? "positive" : "negative"}
            />
          </div>

          <section className="card card-pad" style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Rincian Laba Rugi</h2>
            <div className="activity-list">
              <div className="activity-row">
                <span className="row-main">Omzet (Revenue)</span>
                <span className="row-side">{rupiah(revenue)}</span>
              </div>
              <div className="activity-row">
                <span className="row-main">HPP / COGS</span>
                <span className="row-side negative">({rupiah(cogs)})</span>
              </div>
              <div className="activity-row" style={{ fontWeight: 600 }}>
                <span className="row-main">Laba Kotor</span>
                <span className="row-side">
                  <span className="badge badge-blue">{rupiah(revenue - cogs)}</span>
                </span>
              </div>
              <div className="activity-row">
                <span className="row-main">Beban Operasional Usaha</span>
                <span className="row-side negative">({rupiah(operating)})</span>
              </div>
              <div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}>
                <span className="row-main">Laba Bersih (Net Profit)</span>
                <span className="row-side">
                  <span className={`badge ${net >= 0 ? "badge-green" : "badge-red"}`}>
                    {rupiah(net)}
                  </span>
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === "cash" && (
        <>
          <section className="card card-pad" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Arus Kas Operasional</h2>
            <div className="activity-list">
              <div className="activity-row">
                <span className="row-main">Pemasukan dari Penjualan</span>
                <span className="row-side">
                  <span className="badge badge-green">+{rupiah(revenue)}</span>
                </span>
              </div>
              <div className="activity-row">
                <span className="row-main">Pengeluaran Pembelian Bahan</span>
                <span className="row-side negative">
                  (
                  {rupiah(
                    purchases
                      .filter((item) => inRange(item.date))
                      .reduce((sum, item) => sum + item.paid, 0)
                  )}
                  )
                </span>
              </div>
              <div className="activity-row">
                <span className="row-main">Beban Operasional</span>
                <span className="row-side negative">({rupiah(operating)})</span>
              </div>
              <div className="activity-row" style={{ fontWeight: 600 }}>
                <span className="row-main">Arus Kas Bersih Operasi</span>
                <span className="row-side">
                  {rupiah(
                    revenue -
                      purchases
                        .filter((item) => inRange(item.date))
                        .reduce((sum, item) => sum + item.paid, 0) -
                      operating
                  )}
                </span>
              </div>
            </div>
          </section>

          <section className="card card-pad" style={{ marginTop: 12 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Arus Kas Pendanaan (Modal & Prive)</h2>
            <div className="activity-list">
              <div className="activity-row">
                <span className="row-main">Modal Masuk Disetor</span>
                <span className="row-side">
                  <span className="badge badge-green">
                    +
                    {rupiah(
                      capitalEntries
                        .filter((item) => item.type !== "WITHDRAWAL" && inRange(item.date))
                        .reduce((sum, item) => sum + item.amount, 0)
                    )}
                  </span>
                </span>
              </div>
              <div className="activity-row">
                <span className="row-main">Prive / Tarik Modal Pemilik</span>
                <span className="row-side negative">({rupiah(withdrawals)})</span>
              </div>
              <div className="activity-row" style={{ fontWeight: 600 }}>
                <span className="row-main">Arus Kas Bersih Pendanaan</span>
                <span className="row-side">
                  {rupiah(
                    capitalEntries
                      .filter((item) => item.type !== "WITHDRAWAL" && inRange(item.date))
                      .reduce((sum, item) => sum + item.amount, 0) - withdrawals
                  )}
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === "balance" && (
        <>
          <section className="card card-pad" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Aset (Harta)</h2>
            <div className="activity-list">
              <div className="activity-row">
                <span className="row-main">Kas & Setara Kas</span>
                <span className="row-side">{rupiah(cash)}</span>
              </div>
              <div className="activity-row">
                <span className="row-main">Piutang Usaha</span>
                <span className="row-side">{rupiah(receivableBalance)}</span>
              </div>
              <div className="activity-row">
                <span className="row-main">Persediaan Produk & Bahan</span>
                <span className="row-side">{rupiah(inventory)}</span>
              </div>
              <div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}>
                <span className="row-main">Total Aset</span>
                <span className="row-side">
                  <span className="badge badge-blue">
                    {rupiah(cash + receivableBalance + inventory)}
                  </span>
                </span>
              </div>
            </div>
          </section>

          <section className="card card-pad" style={{ marginTop: 12 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Kewajiban (Utang)</h2>
            <div className="activity-list">
              <div className="activity-row">
                <span className="row-main">Utang Usaha ke Supplier</span>
                <span className="row-side">{rupiah(payableBalance)}</span>
              </div>
              <div className="activity-row" style={{ fontWeight: 700 }}>
                <span className="row-main">Total Kewajiban</span>
                <span className="row-side">
                  <span className="badge badge-amber">{rupiah(payableBalance)}</span>
                </span>
              </div>
            </div>
          </section>

          <section className="card card-pad" style={{ marginTop: 12 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>Ekuitas (Modal Pemilik)</h2>
            <div className="activity-list">
              <div className="activity-row">
                <span className="row-main">Modal Disetor</span>
                <span className="row-side">
                  {rupiah(
                    capitalEntries
                      .filter((item) => item.type !== "WITHDRAWAL")
                      .reduce((sum, item) => sum + item.amount, 0)
                  )}
                </span>
              </div>
              <div className="activity-row">
                <span className="row-main">Prive Akumulasi</span>
                <span className="row-side negative">({rupiah(withdrawals)})</span>
              </div>
              <div className="activity-row">
                <span className="row-main">Laba Periode Berjalan</span>
                <span className="row-side">{rupiah(net)}</span>
              </div>
              <div className="activity-row" style={{ fontWeight: 700, fontSize: 15 }}>
                <span className="row-main">Total Ekuitas</span>
                <span className="row-side">
                  <span className="badge badge-green">
                    {rupiah(
                      capitalEntries
                        .filter((item) => item.type !== "WITHDRAWAL")
                        .reduce((sum, item) => sum + item.amount, 0) -
                        withdrawals +
                        net
                    )}
                  </span>
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
