import { Modal, ModalFooter } from "@/components/ui/modal";
import { rupiah } from "@/lib/format";
import type { Purchase, Material, Party } from "@/lib/types";
import type { FormEvent } from "react";

export function SupplierReturnModal({
  purchases,
  materials,
  suppliers,
  onClose,
  onSave,
}: {
  purchases: Purchase[];
  materials: Material[];
  suppliers: Party[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal
      title="Catat Retur ke Supplier"
      description="Kurangi stok bahan yang rusak/dikembalikan ke supplier secara otomatis."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="return-purchase">Pembelian asal *</label>
            <select
              className="select"
              id="return-purchase"
              name="purchase"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Pilih transaksi pembelian
              </option>
              {purchases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.supplier} — {rupiah(item.total)} ({item.date})
                </option>
              ))}
            </select>
          </div>

          <div className="field full">
            <label htmlFor="return-supplier">Supplier *</label>
            <select
              className="select"
              id="return-supplier"
              name="supplier"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Pilih supplier
              </option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field full">
            <label htmlFor="return-material">Bahan baku yang diretur *</label>
            <select
              className="select"
              id="return-material"
              name="material"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Pilih bahan
              </option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.stock} {item.unit} tersedia)
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="return-qty">Kuantitas retur *</label>
            <input
              className="input"
              id="return-qty"
              name="qty"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="return-reason">Alasan retur</label>
            <input
              className="input"
              id="return-reason"
              name="reason"
              placeholder="Contoh: Barang rusak / kemasan pecah"
            />
          </div>

          <div className="field full">
            <label htmlFor="return-notes">Catatan tambahan</label>
            <textarea
              className="textarea"
              id="return-notes"
              name="notes"
              placeholder="Detail komunikasi retur dengan supplier"
            />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Simpan retur" />
      </form>
    </Modal>
  );
}
