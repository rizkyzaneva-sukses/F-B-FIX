import { Package, Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah, dateLabel } from "@/lib/format";
import type { Material, Purchase } from "@/lib/types";

export function PurchasesView({
  purchases,
  materials,
  onAdd,
  onPay,
  onReturn,
}: {
  purchases: Purchase[];
  materials: Material[];
  onAdd: () => void;
  onPay: (id: string) => void;
  onReturn: () => void;
}) {
  const totalPurchases = purchases.reduce((sum, item) => sum + item.total, 0);
  const totalDebt = purchases.reduce((sum, item) => sum + item.remaining, 0);

  return (
    <main className="page">
      <PageHeading
        eyebrow="Operasional"
        title="Pembelian & Utang Supplier"
        description="Catat pembelian bahan baku, pantau sisa utang dagang, dan catat retur barang."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button button-secondary" onClick={onReturn}>
              <Package size={16} />
              Retur ke Supplier
            </button>
            <button className="button button-primary" onClick={onAdd}>
              <Plus size={16} />
              Catat Pembelian
            </button>
          </div>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Total Belanja Pembelian" value={shortRupiah(totalPurchases)} />
        <MiniStat
          label="Sisa Utang ke Supplier"
          value={shortRupiah(totalDebt)}
          tone={totalDebt > 0 ? "negative" : undefined}
        />
        <MiniStat label="Total Transaksi" value={`${purchases.length} nota`} />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Nama Supplier</th>
              <th>Total Tagihan</th>
              <th>Sudah Dibayar</th>
              <th>Sisa Utang</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className="table-muted">{dateLabel(p.date)}</td>
                <td className="table-primary">{p.supplier}</td>
                <td>{rupiah(p.total)}</td>
                <td>{rupiah(p.paid)}</td>
                <td className={p.remaining > 0 ? "negative" : "table-muted"}>
                  {rupiah(p.remaining)}
                </td>
                <td>
                  <span
                    className={`badge ${
                      p.status === "LUNAS"
                        ? "badge-green"
                        : p.status === "SEBAGIAN"
                        ? "badge-blue"
                        : "badge-amber"
                    }`}
                  >
                    {p.status === "LUNAS"
                      ? "Lunas"
                      : p.status === "SEBAGIAN"
                      ? "Sebagian"
                      : "Belum Lunas"}
                  </span>
                </td>
                <td>
                  {p.remaining > 0 ? (
                    <button
                      className="button button-primary"
                      style={{ minHeight: 32, padding: "0 12px", fontSize: 11 }}
                      onClick={() => onPay(p.payableId || p.id)}
                    >
                      Bayar
                    </button>
                  ) : (
                    <span className="table-muted" style={{ fontSize: 11 }}>
                      -
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!purchases.length && (
              <tr>
                <td colSpan={7} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada transaksi pembelian bahan baku.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
