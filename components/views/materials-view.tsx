import { FileDown, FileUp, Plus, Search } from "lucide-react";
import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah } from "@/lib/format";
import type { Material } from "@/lib/types";

export function MaterialsView({
  materials,
  onAdd,
  onImport,
  onDownloadTemplate,
}: {
  materials: Material[];
  onAdd: () => void;
  onImport: (file: File) => void;
  onDownloadTemplate: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = materials.filter((m) => m.stock <= 2);
  const totalValuation = materials.reduce((sum, item) => sum + item.stock * item.lastBuy, 0);

  return (
    <main className="page">
      <PageHeading
        eyebrow="Inventori"
        title="Bahan Baku & Mentah"
        description="Pantau stok bahan mentah, harga beli terakhir dari supplier, dan kebutuhan restock."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button button-secondary" onClick={onDownloadTemplate}>
              <FileDown size={16} />
              Template
            </button>
            <label className="button button-secondary" style={{ cursor: "pointer" }}>
              <FileUp size={16} />
              Import
              <input
                type="file"
                accept=".xlsx,.csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImport(file);
                }}
              />
            </label>
            <button className="button button-primary" onClick={onAdd}>
              <Plus size={16} />
              Tambah Bahan
            </button>
          </div>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Total Jenis Bahan" value={`${materials.length} item`} />
        <MiniStat
          label="Perlu RestockSegera"
          value={`${lowStock.length} item`}
          tone={lowStock.length > 0 ? "negative" : undefined}
        />
        <MiniStat label="Estimasi Nilai Bahan" value={shortRupiah(totalValuation)} />
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-pad" style={{ paddingBottom: 12 }}>
          <div className="toolbar">
            <div className="search-field">
              <Search size={16} />
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari bahan baku..."
              />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Bahan</th>
                <th>Stok Saat Ini</th>
                <th>Satuan</th>
                <th>Harga Beli Terakhir</th>
                <th>Supplier Default</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="table-primary">{item.name}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.stock > 5
                          ? "badge-green"
                          : item.stock > 1
                          ? "badge-amber"
                          : "badge-red"
                      }`}
                    >
                      {item.stock} {item.unit}
                    </span>
                  </td>
                  <td>{item.unit}</td>
                  <td className="table-primary">{rupiah(item.lastBuy)}</td>
                  <td className="table-muted">{item.supplier || "-"}</td>
                  <td>
                    <span className={`badge ${item.active ? "badge-green" : "badge-amber"}`}>
                      {item.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="table-muted" style={{ textAlign: "center", padding: 30 }}>
                    Tidak ada bahan baku yang terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
