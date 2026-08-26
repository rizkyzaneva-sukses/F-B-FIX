import { Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { dateLabel } from "@/lib/format";
import type { DeliveryOrder, SalesOrder } from "@/lib/types";

export function B2BDeliveriesView({
  deliveries,
  orders,
  onAdd,
  onDeliver,
}: {
  deliveries: DeliveryOrder[];
  orders: SalesOrder[];
  onAdd: () => void;
  onDeliver: (doId: string, soId: string) => void;
}) {
  const confirmedOrders = orders.filter((so) => so.status === "CONFIRMED");

  return (
    <main className="page">
      <PageHeading
        eyebrow="B2B / Grosir"
        title="Surat Jalan & Pengiriman"
        description="Buat dan pantau surat jalan resmi untuk pengiriman pesanan grosir ke pelanggan."
        action={
          <button
            className="button button-primary"
            onClick={onAdd}
            disabled={!confirmedOrders.length}
            title={!confirmedOrders.length ? "Harus ada SO berstatus Confirmed" : undefined}
          >
            <Plus size={16} />
            Buat Surat Jalan
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Total Surat Jalan" value={`${deliveries.length} DO`} />
        <MiniStat
          label="Dalam Pengiriman (Pending)"
          value={`${deliveries.filter((d) => d.status === "PENDING").length} DO`}
        />
        <MiniStat
          label="Terkonfirmasi Diterima"
          value={`${deliveries.filter((d) => d.status === "DELIVERED").length} DO`}
        />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal Kirim</th>
              <th>Nama Pelanggan</th>
              <th>No. Sales Order</th>
              <th>Driver / Kurir</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td className="table-muted">{dateLabel(d.delivery_date)}</td>
                <td className="table-primary">{d.customer_name || "-"}</td>
                <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                  {d.sales_order_id.slice(0, 8)}
                </td>
                <td>{d.driver_name || <span className="table-muted">-</span>}</td>
                <td>
                  <span
                    className={`badge ${
                      d.status === "DELIVERED" ? "badge-green" : "badge-amber"
                    }`}
                  >
                    {d.status === "DELIVERED" ? "Terkirim" : "Dalam Perjalanan"}
                  </span>
                </td>
                <td>
                  {d.status === "PENDING" ? (
                    <button
                      className="button button-primary"
                      style={{ minHeight: 32, padding: "0 11px", fontSize: 11 }}
                      onClick={() => onDeliver(d.id, d.sales_order_id)}
                    >
                      Konfirmasi Sampai
                    </button>
                  ) : (
                    <span className="table-muted" style={{ fontSize: 11 }}>
                      Selesai
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!deliveries.length && (
              <tr>
                <td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada surat jalan pengiriman yang dibuat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
