import { FileDown, FileUp, Plus, Search, Package } from "lucide-react";
import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { MiniStat } from "@/components/ui/kpi-card";
import { rupiah, shortRupiah } from "@/lib/format";
import type { Product, View } from "@/lib/types";

export function ProductsView({
  products,
  onAdd,
  onNavigate,
  onImport,
  onDownloadTemplate,
}: {
  products: Product[];
  onAdd: () => void;
  onNavigate: (view: View) => void;
  onImport: (file: File) => void;
  onDownloadTemplate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === "Semua" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalStockValue = products.reduce((sum, item) => sum + item.stock * item.price, 0);

  return (
    <main className="page">
      <PageHeading
        eyebrow="Inventori"
        title="Katalog Produk Jadi"
        description="Kelola produk siap jual, pantau ketersediaan stok, dan perbarui harga jual."
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
                  e.target.value = "";
                }}
              />
            </label>
            <button className="button button-primary" onClick={onAdd}>
              <Plus size={16} />
              Tambah Produk
            </button>
          </div>
        }
      />

      <div className="page-card-grid">
        <MiniStat label="Total Produk Terdaftar" value={`${products.length} item`} />
        <MiniStat
          label="Stok Tersedia"
          value={`${products.reduce((s, p) => s + p.stock, 0)} unit`}
        />
        <MiniStat label="Nilai Aset Produk" value={shortRupiah(totalStockValue)} />
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
                placeholder="Cari produk berdasarkan nama..."
              />
            </div>
            <select
              className="select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ minWidth: 140 }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Harga Jual</th>
                <th>HPP Terakhir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="item-cell">
                      <div className="item-avatar">{item.emoji || "🍽️"}</div>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.unit}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{item.category}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.stock > 10
                          ? "badge-green"
                          : item.stock > 0
                          ? "badge-amber"
                          : "badge-red"
                      }`}
                    >
                      {item.stock} {item.unit}
                    </span>
                  </td>
                  <td className="table-primary">{rupiah(item.price)}</td>
                  <td className="table-muted">{item.cogs > 0 ? rupiah(item.cogs) : "-"}</td>
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
                    Tidak ada produk yang cocok dengan pencarian.
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
