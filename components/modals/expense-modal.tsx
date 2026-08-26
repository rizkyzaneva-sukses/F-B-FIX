import { Modal, ModalFooter } from "@/components/ui/modal";
import type { FormEvent } from "react";

export function ExpenseModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal
      title="Tambah Pengeluaran"
      description="Pisahkan beban operasional usaha dari prive (tarik modal) pemilik."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="date">
              Tanggal <span>*</span>
            </label>
            <input
              className="input"
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="expenseType">Jenis Pengeluaran</label>
            <select className="select" id="expenseType" name="expenseType" defaultValue="OPERATING">
              <option value="OPERATING">Beban Operasional Usaha</option>
              <option value="OWNER_WITHDRAWAL">Prive / Tarik Modal Pemilik</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="category">
              Kategori <span>*</span>
            </label>
            <input
              className="input"
              id="category"
              name="category"
              defaultValue="Operasional"
              placeholder="Contoh: Kemasan, Gas, Listrik, Sewa, Gaji"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="amount">
              Nominal (Rp) <span>*</span>
            </label>
            <input
              className="input"
              id="amount"
              name="amount"
              type="number"
              min="1"
              placeholder="0"
              required
            />
          </div>

          <div className="field full">
            <label htmlFor="note">Catatan Tambahan</label>
            <textarea
              className="textarea"
              id="note"
              name="note"
              placeholder="Contoh: Pembelian gas 3kg untuk produksi siang"
            />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Simpan pengeluaran" />
      </form>
    </Modal>
  );
}
