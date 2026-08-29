import { Modal, ModalFooter } from "@/components/ui/modal";
import type { FormEvent } from "react";

export function PartyModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal
      title="Tambah Pelanggan / Mitra / Supplier"
      description="Pilih Pelanggan untuk toko, Mitra untuk B2B / grosir, atau Supplier untuk pembelian bahan."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="partyType">Tipe Kontak *</label>
            <select className="select" id="partyType" name="partyType" defaultValue="CUSTOMER">
              <option value="CUSTOMER">Pelanggan (toko / POS)</option>
              <option value="MITRA">Mitra (B2B / grosir)</option>
              <option value="SUPPLIER">Pemasok (Supplier)</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="name">Nama Kontak / Usaha *</label>
            <input
              className="input"
              id="name"
              name="name"
              placeholder="Contoh: Warung Bu Tini / CV Pangan Jaya"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="phone">Nomor Telepon / WhatsApp</label>
            <input
              className="input"
              id="phone"
              name="phone"
              placeholder="Contoh: 081234567890"
            />
          </div>

          <div className="field">
            <label htmlFor="creditLimit">Limit Piutang (Rp)</label>
            <input
              className="input"
              id="creditLimit"
              name="creditLimit"
              type="number"
              min="0"
              defaultValue="0"
            />
          </div>

          <div className="field full">
            <label htmlFor="address">Alamat Lengkap</label>
            <textarea
              className="textarea"
              id="address"
              name="address"
              placeholder="Alamat kantor, outlet, atau gudang"
            />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Simpan kontak" />
      </form>
    </Modal>
  );
}
