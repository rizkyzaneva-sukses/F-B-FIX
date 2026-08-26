import { Printer } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, dateLabel } from "@/lib/format";
import type { Receivable } from "@/lib/types";

export function ReceivablesView({
  receivables,
  onPay,
}: {
  receivables: Receivable[];
  onPay: (id: string) => void;
}) {
  const totalOutstanding = receivables.reduce(
    (sum, item) => sum + Math.max(0, item.amount - item.paid),
    0
  );

  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dueSoon = receivables.filter((item) => item.amount > item.paid && item.due <= weekAhead).length;
  const activeDebtors = receivables.filter((item) => item.amount > item.paid).length;

  return (
    <main className="page">
      <PageHeading
        eyebrow="Keuangan"
        title="Piutang Penjualan Pelanggan"
        description="Pantau tagihan yang belum lunas dari kasir dan terima pembayaran bertahap."
        action={
          <button className="button button-secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Cetak Rekap Piutang
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat
          label="Total Piutang Belum Tertagih"
          value={rupiah(totalOutstanding)}
          tone={totalOutstanding > 0 ? "negative" : undefined}
        />
        <MiniStat label="Pelanggan Masih Berutang" value={`${activeDebtors} orang`} />
        <MiniStat
          label="Jatuh Tempo &le; 7 Hari"
          value={`${dueSoon} tagihan`}
          tone={dueSoon > 0 ? "negative" : undefined}
        />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>No. Transaksi</th>
              <th>Jatuh Tempo</th>
              <th>Total Tagihan</th>
              <th>Sisa Piutang</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {receivables.map((item) => {
              const remaining = item.amount - item.paid;
              const status =
                remaining <= 0 ? "LUNAS" : item.paid > 0 ? "SEBAGIAN" : "BELUM LUNAS";

              return (
                <tr key={item.id}>
                  <td className="table-primary">{item.customer}</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                    {item.invoice}
                  </td>
                  <td className={remaining > 0 ? "negative" : "table-muted"}>
                    {dateLabel(item.due)}
                  </td>
                  <td>{rupiah(item.amount)}</td>
                  <td className="table-primary">{rupiah(Math.max(0, remaining))}</td>
                  <td>
                    <span
                      className={`badge ${
                        status === "LUNAS"
                          ? "badge-green"
                          : status === "SEBAGIAN"
                          ? "badge-blue"
                          : "badge-amber"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td>
                    {remaining > 0 ? (
                      <button
                        className="button button-primary"
                        style={{ minHeight: 32, padding: "0 12px", fontSize: 11 }}
                        onClick={() => onPay(item.id)}
                      >
                        Terima Bayar
                      </button>
                    ) : (
                      <span className="table-muted" style={{ fontSize: 11 }}>
                        Lunas
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!receivables.length && (
              <tr>
                <td colSpan={7} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Tidak ada data piutang pelanggan saat ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
