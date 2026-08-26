import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import type { Material } from "@/lib/types";
import type { FormEvent } from "react";

export function PurchaseModal({
  materials,
  suppliers,
  onCreateSupplier,
  onClose,
  onSave,
}: {
  materials: Material[];
  suppliers: string[];
  onCreateSupplier: (name: string) => Promise<string | null>;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [supplier, setSupplier] = useState("");
  const [creating, setCreating] = useState(false);

  const createSupplier = async () => {
    if (!supplier.trim()) return;
    setCreating(true);
    const name = await onCreateSupplier(supplier);
    if (name) setSupplier(name);
    setCreating(false);
  };

  return (
    <Modal
      title="Catat Pembelian Bahan"
      description="Stok bahan dan harga beli terakhir akan langsung diperbarui di inventori."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="purchase-supplier">Supplier *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                id="purchase-supplier"
                name="supplier"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                list="supplier-options"
                placeholder="Pilih atau ketik nama supplier"
                required
              />
              <button
                type="button"
                className="button button-secondary"
                disabled={
                  creating ||
                  !supplier.trim() ||
                  suppliers.some((name) => name.toLowerCase() === supplier.trim().toLowerCase())
                }
                onClick={createSupplier}
              >
                {creating ? "Menyimpan..." : "Simpan Baru"}
              </button>
            </div>
            <datalist id="supplier-options">
              {suppliers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="field full">
            <label htmlFor="material-select">Bahan baku *</label>
            <select className="select" id="material-select" name="material" defaultValue="" required>
              <option value="" disabled>
                Pilih bahan baku
              </option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit}) — Terakhir Rp {item.lastBuy.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="qty">Kuantitas *</label>
            <input className="input" id="qty" name="qty" type="number" min="0.01" step="0.01" required />
          </div>

          <div className="field">
            <label htmlFor="price">Harga / unit (Rp) *</label>
            <input className="input" id="price" name="price" type="number" min="0" required />
          </div>

          <div className="field">
            <label htmlFor="paid">Dibayar sekarang (Rp)</label>
            <input className="input" id="paid" name="paid" type="number" min="0" defaultValue="0" />
          </div>

          <div className="field">
            <label htmlFor="payMethod">Metode pembayaran</label>
            <select className="select" id="payMethod" name="paymentMethod" defaultValue="TUNAI">
              <option value="TUNAI">Tunai</option>
              <option value="TRANSFER">Transfer</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>

          <div className="field full">
            <label htmlFor="dueDate">Jatuh tempo pelunasan (jika utang)</label>
            <input className="input" id="dueDate" name="dueDate" type="date" />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Simpan pembelian" />
      </form>
    </Modal>
  );
}
