import { Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah, dateLabel } from "@/lib/format";
import type { Invoice, SalesOrder } from "@/lib/types";

export function B2BInvoicesView({
  invoices,
  orders,
  onAdd,
  onPay,
}: {
  invoices: Invoice[];
  orders: SalesOrder[];
  onAdd: () => void;
  onPay: (id: string) => void;
}) {
  const deliveredOrders = orders.filter((so) => so.status === "DELIVERED");

  const statusBadge = (status: Invoice["status"]) => {
    const map: Record<string, string> = {
      UNPAID: "badge-red",
      PARTIAL: "badge-amber",
      PAID: "badge-green",
      OVERDUE: "badge-red",
    };
    return (
      <span className={`badge ${map[status] || "badge-red"}`}>
        {status === "PAID"
          ? "Lunas"
          : status === "PARTIAL"
          ? "Sebagian"
          : status === "OVERDUE"
          ? "Jatuh Tempo"
          : "Belum Bayar"}
      </span>
    );
  };

  const outstanding = invoices.reduce(
    (s, inv) => s + Math.max(0, inv.total_amount - inv.paid_amount),
    0
  );

  return (
    <main className="page">
      <PageHeading
        eyebrow="B2B / Grosir"
        title="Faktur Invoice Tagihan"
        description="Terbitkan tagihan resmi dari pesanan yang sudah terkirim dan catat penerimaan dana."
        action={
          <button
            className="button button-primary"
            onClick={onAdd}
            disabled={!deliveredOrders.length}
            title={!deliveredOrders.length ? "Harus ada pesanan yang sudah terkirim" : undefined}
          >
            <Plus size={16} />
            Terbitkan Invoice
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Total Invoice Diterbitkan" value={`${invoices.length} invoice`} />
        <MiniStat
          label="Piutang B2B Outstanding"
          value={shortRupiah(outstanding)}
          tone={outstanding > 0 ? "negative" : undefined}
        />
        <MiniStat
          label="Invoice Lunas"
          value={`${invoices.filter((inv) => inv.status === "PAID").length} dari ${invoices.length}`}
        />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>No. Invoice</th>
              <th>Nama Pelanggan</th>
              <th>Tanggal</th>
              <th>Jatuh Tempo</th>
              <th>Total Tagihan</th>
              <th>Telah Dibayar</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td
                  className="table-primary"
                  style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}
                >
                  {inv.invoice_number}
                </td>
                <td>{inv.customer_name || "-"}</td>
                <td className="table-muted">{dateLabel(inv.invoice_date)}</td>
                <td className={inv.status !== "PAID" ? "negative" : "table-muted"}>
                  {dateLabel(inv.due_date)}
                </td>
                <td className="table-primary">{rupiah(inv.total_amount)}</td>
                <td>{rupiah(inv.paid_amount)}</td>
                <td>{statusBadge(inv.status)}</td>
                <td>
                  {inv.status !== "PAID" ? (
                    <button
                      className="button button-primary"
                      style={{ minHeight: 32, padding: "0 11px", fontSize: 11 }}
                      onClick={() => onPay(inv.id)}
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
            ))}
            {!invoices.length && (
              <tr>
                <td colSpan={8} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada invoice tagihan B2B.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
