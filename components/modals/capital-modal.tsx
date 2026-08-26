import { Modal, ModalFooter } from "@/components/ui/modal";
import type { FormEvent } from "react";

export function CapitalModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal
      title="Catat Modal & Prive"
      description="Modal menambah ekuitas dan kas; prive mengurangi ekuitas pemilik (tidak masuk laba rugi)."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="capital-type">Jenis Transaksi *</label>
            <select className="select" id="capital-type" name="type" defaultValue="ADDITION">
              <option value="INITIAL">Modal Awal Usaha</option>
              <option value="ADDITION">Tambahan Modal Disetor</option>
              <option value="WITHDRAWAL">Prive / Tarik Modal Pemilik</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="capital-date">Tanggal *</label>
            <input
              className="input"
              id="capital-date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="capital-amount">Nominal (Rp) *</label>
            <input
              className="input"
              id="capital-amount"
              name="amount"
              type="number"
              min="1"
              placeholder="0"
              required
            />
          </div>

          <div className="field full">
            <label htmlFor="capital-note">Catatan / Keterangan</label>
            <textarea
              className="textarea"
              id="capital-note"
              name="note"
              placeholder="Contoh: Tambahan modal setor dari pemilik untuk ekspansi mesin"
            />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Simpan transaksi modal" />
      </form>
    </Modal>
  );
}
