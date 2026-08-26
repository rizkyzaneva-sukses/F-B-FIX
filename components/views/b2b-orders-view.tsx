import { Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah, dateLabel } from "@/lib/format";
import type { SalesOrder } from "@/lib/types";

export function B2BOrdersView({
  orders,
  onAdd,
  onConfirm,
}: {
  orders: SalesOrder[];
  onAdd: () => void;
  onConfirm: (id: string) => void;
}) {
  const statusBadge = (status: SalesOrder["status"]) => {
    const map: Record<string, string> = {
      DRAFT: "badge-blue",
      CONFIRMED: "badge-green",
      DELIVERED: "badge-green",
      INVOICED: "badge-emerald",
      CANCELLED: "badge-red",
    };
    return <span className={`badge ${map[status] || "badge-blue"}`}>{status}</span>;
  };

  const totalValue = orders.reduce((s, o) => s + o.total_amount, 0);

  return (
    <main className="page">
      <PageHeading
        eyebrow="B2B / Grosir"
        title="Sales Order (Pesanan Grosir)"
        description="Kelola pesanan penjualan B2B dengan syarat termin pembayaran khusus."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} />
            Buat Sales Order
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Total Sales Order" value={`${orders.length} pesanan`} />
        <MiniStat
          label="Menunggu Konfirmasi (Draft)"
          value={`${orders.filter((o) => o.status === "DRAFT").length} SO`}
        />
        <MiniStat label="Total Nilai Pesanan" value={shortRupiah(totalValue)} />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Nama Pelanggan</th>
              <th>Termin</th>
              <th>Total Nilai</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((so) => (
              <tr key={so.id}>
                <td className="table-muted">{dateLabel(so.order_date)}</td>
                <td className="table-primary">{so.customer_name}</td>
                <td>NET {so.payment_terms_days} hari</td>
                <td className="table-primary">{rupiah(so.total_amount)}</td>
                <td>{statusBadge(so.status)}</td>
                <td>
                  {so.status === "DRAFT" ? (
                    <button
                      className="button button-primary"
                      style={{ minHeight: 32, padding: "0 11px", fontSize: 11 }}
                      onClick={() => onConfirm(so.id)}
                    >
                      Konfirmasi SO
                    </button>
                  ) : (
                    <span className="table-muted" style={{ fontSize: 11 }}>
                      -
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada Sales Order B2B. Klik &quot;Buat Sales Order&quot; untuk memulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
