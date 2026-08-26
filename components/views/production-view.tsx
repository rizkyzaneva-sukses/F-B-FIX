import { Plus } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, dateLabel } from "@/lib/format";
import type { Batch, Material, Product } from "@/lib/types";

export function ProductionView({
  batches,
  products,
  materials,
  onAdd,
}: {
  batches: Batch[];
  products: Product[];
  materials: Material[];
  onAdd: () => void;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyBatches = batches.filter((batch) => batch.date.slice(0, 7) === currentMonth);

  return (
    <main className="page">
      <PageHeading
        eyebrow="Operasional"
        title="Produksi Batch & HPP"
        description="Ubah bahan baku menjadi stok produk jadi dengan perhitungan HPP riil yang presisi."
        action={
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} />
            Buat Batch Produksi
          </button>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Batch Bulan Ini" value={`${monthlyBatches.length} batch`} />
        <MiniStat label="Produk Aktif" value={`${products.filter((p) => p.active).length} varian`} />
        <MiniStat label="Bahan Terpantau" value={`${materials.length} item`} />
      </div>

      <section className="card table-wrap" style={{ marginTop: 20 }}>
        <div className="card-pad section-header">
          <div>
            <h2>Riwayat Batch Produksi</h2>
            <p>HPP tersimpan otomatis dari setiap proses racik / produksi</p>
          </div>
          <span className="badge badge-blue">Terbaru</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Kode Batch</th>
              <th>Produk Output</th>
              <th>Qty Hasil</th>
              <th>HPP / Unit</th>
              <th>Tanggal Produksi</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td
                  className="table-primary"
                  style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}
                >
                  {batch.code}
                </td>
                <td className="table-primary">{batch.product}</td>
                <td>{batch.qty} unit</td>
                <td className="table-primary">{rupiah(batch.cogs)}</td>
                <td className="table-muted">{dateLabel(batch.date)}</td>
                <td>
                  <span className="badge badge-green">Selesai</span>
                </td>
              </tr>
            ))}
            {!batches.length && (
              <tr>
                <td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                  Belum ada batch produksi yang dicatat. Klik &quot;Buat Batch Produksi&quot; untuk
                  memulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
