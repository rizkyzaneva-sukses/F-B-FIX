import { Plus, Trash2, CircleDollarSign } from "lucide-react";
import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import type { Product, Material } from "@/lib/types";
import type { FormEvent } from "react";

export function ProductionModal({
  products,
  materials,
  onClose,
  onSave,
}: {
  products: Product[];
  materials: Material[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [outRows, setOutRows] = useState([0]);
  const [matRows, setMatRows] = useState([0]);

  return (
    <Modal
      large
      title="Buat Batch Produksi"
      description="Satu batch bisa menghasilkan beberapa varian produk kemasan. HPP dihitung otomatis."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 14, margin: 0 }}>1. Produk Hasil (Output)</h2>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
              Produk jadi yang dihasilkan dari proses ini
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            style={{ minHeight: 32, padding: "0 10px", fontSize: 11 }}
            onClick={() => setOutRows((c) => [...c, c.length ? Math.max(...c) + 1 : 0])}
          >
            <Plus size={14} />
            Tambah Kemasan
          </button>
        </div>

        {outRows.map((row, i) => (
          <div className="form-grid" key={`out-${row}`} style={{ marginTop: 8 }}>
            <div className="field">
              <label>
                {i === 0 ? "Produk output *" : `Produk output ${i + 1} *`}
              </label>
              <select className="select" name="output" defaultValue="" required>
                <option value="" disabled>
                  Pilih produk
                </option>
                {products
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>Jumlah hasil (qty) *</label>
              <input
                className="input"
                name="outputQty"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Contoh: 50"
                required
              />
            </div>
            {outRows.length > 1 && (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setOutRows((c) => c.filter((v) => v !== row))}
                style={{ alignSelf: "end", minHeight: 38 }}
                aria-label="Hapus baris"
              >
                <Trash2 size={16} color="var(--error)" />
              </button>
            )}
          </div>
        ))}

        <div className="section-header" style={{ marginTop: 20 }}>
          <div>
            <h2 style={{ fontSize: 14, margin: 0 }}>2. Bahan Baku yang Digunakan</h2>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
              Stok bahan akan otomatis dipotong saat batch disimpan
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            style={{ minHeight: 32, padding: "0 10px", fontSize: 11 }}
            onClick={() => setMatRows((c) => [...c, c.length ? Math.max(...c) + 1 : 0])}
          >
            <Plus size={14} />
            Tambah Bahan
          </button>
        </div>

        {matRows.map((row, index) => (
          <div className="form-grid" key={`mat-${row}`} style={{ marginTop: 8 }}>
            <div className="field">
              <label>Bahan baku {index + 1} *</label>
              <select className="select" name="material" defaultValue="" required>
                <option value="" disabled>
                  Pilih bahan baku
                </option>
                {materials
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Tersedia {item.stock} {item.unit})
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>Jumlah dipakai *</label>
              <input
                className="input"
                name="materialQty"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                required
              />
            </div>
            {matRows.length > 1 && (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setMatRows((c) => c.filter((v) => v !== row))}
                style={{ alignSelf: "end", minHeight: 38 }}
                aria-label="Hapus baris"
              >
                <Trash2 size={16} color="var(--error)" />
              </button>
            )}
          </div>
        ))}

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="otherCost">Biaya lain-lain (Gas, Tenaga Kerja, Kemasan dll) (Rp)</label>
          <input
            className="input"
            id="otherCost"
            name="otherCost"
            type="number"
            min="0"
            defaultValue="0"
          />
        </div>

        <div className="callout" style={{ marginTop: 14 }}>
          <CircleDollarSign size={17} style={{ flexShrink: 0 }} />
          <div>
            <strong>Perhitungan HPP Otomatis</strong>
            <p>HPP / unit = (Total harga bahan baku + Biaya lain) &divide; Total unit output.</p>
          </div>
        </div>

        <ModalFooter onClose={onClose} submitLabel="Selesaikan batch produksi" />
      </form>
    </Modal>
  );
}
