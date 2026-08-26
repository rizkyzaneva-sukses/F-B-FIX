import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import type { Party, Product } from "@/lib/types";

export function B2BOrderModal({
  customers,
  products,
  onClose,
  onSave,
}: {
  customers: Party[];
  products: Product[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [rows, setRows] = useState([0]);

  return (
    <Modal
      large
      title="Buat Sales Order B2B"
      description="Pilih pelanggan bisnis, tambahkan produk grosir, dan atur termin pembayaran."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="so-customer">Pelanggan Bisnis *</label>
            <select className="select" id="so-customer" name="customer" defaultValue="" required>
              <option value="" disabled>
                Pilih pelanggan
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="so-terms">Termin Pembayaran</label>
            <select className="select" id="so-terms" name="paymentTerms" defaultValue={30}>
              <option value={7}>NET 7 Hari</option>
              <option value={14}>NET 14 Hari</option>
              <option value={30}>NET 30 Hari</option>
              <option value={60}>NET 60 Hari</option>
              <option value={90}>NET 90 Hari</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="so-notes">Catatan Pesanan</label>
            <input
              className="input"
              id="so-notes"
              name="notes"
              placeholder="Contoh: Pengiriman ke Cabang Dago"
            />
          </div>
        </div>

        <div className="section-header" style={{ marginTop: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, margin: 0 }}>Item Pesanan</h2>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
              Produk yang dipesan pelanggan
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            style={{ minHeight: 32, padding: "0 10px", fontSize: 11 }}
            onClick={() => setRows((c) => [...c, c.length ? Math.max(...c) + 1 : 0])}
          >
            <Plus size={14} />
            Tambah Item
          </button>
        </div>

        {rows.map((row, i) => (
          <div className="form-grid three" key={row} style={{ marginTop: 8 }}>
            <div className="field">
              <label>{i === 0 ? "Produk *" : `Produk ${i + 1} *`}</label>
              <select className="select" name="itemId" defaultValue="" required>
                <option value="" disabled>
                  Pilih produk
                </option>
                {products
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>Kuantitas *</label>
              <input
                className="input"
                name="itemQty"
                type="number"
                min="1"
                step="0.01"
                placeholder="0"
                required
              />
            </div>
            <div className="field">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label>Harga / unit *</label>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => setRows((c) => c.filter((v) => v !== row))}
                    style={{ padding: 0, minHeight: "auto" }}
                    aria-label="Hapus"
                  >
                    <Trash2 size={14} color="var(--error)" />
                  </button>
                )}
              </div>
              <input
                className="input"
                name="itemPrice"
                type="number"
                min="0"
                placeholder="0"
                required
              />
            </div>
          </div>
        ))}

        <ModalFooter onClose={onClose} submitLabel="Simpan Sales Order" />
      </form>
    </Modal>
  );
}
