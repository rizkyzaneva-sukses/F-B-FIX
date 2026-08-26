import { Modal, ModalFooter } from "@/components/ui/modal";
import type { FormEvent } from "react";

export function CashReconModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal
      title="Input Rekonsiliasi Kas Harian"
      description="Masukkan hasil hitungan kas fisik di laci dan bandingkan dengan catatan kas sistem."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="recon-date">Tanggal Shift / Tutup Kasir *</label>
            <input
              className="input"
              id="recon-date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="recon-system">Kas Menurut Sistem (Rp) *</label>
            <input
              className="input"
              id="recon-system"
              name="systemCash"
              type="number"
              min="0"
              placeholder="Contoh: 1500000"
              required
            />
          </div>

          <div className="field full">
            <label htmlFor="recon-physical">Kas Fisik Aktual di Laci (Rp) *</label>
            <input
              className="input"
              id="recon-physical"
              name="physicalCash"
              type="number"
              min="0"
              placeholder="Hasil hitungan manual uang kertas + logam"
              required
            />
          </div>

          <div className="field full">
            <label htmlFor="recon-notes">Catatan & Penjelasan Selisih</label>
            <textarea
              className="textarea"
              id="recon-notes"
              name="notes"
              placeholder="Contoh: Selisih minus Rp 15.000 terpakai untuk beli air galon"
            />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Simpan rekonsiliasi" />
      </form>
    </Modal>
  );
}
