import { Modal, ModalFooter } from "@/components/ui/modal";
import { rupiah } from "@/lib/format";
import type { PartialPaymentTarget } from "@/lib/types";
import type { FormEvent } from "react";

export function PartialPaymentModal({
  target,
  onClose,
  onSave,
}: {
  target: PartialPaymentTarget;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const label =
    target.kind === "payable"
      ? "Bayar utang supplier"
      : target.kind === "receivable"
      ? "Terima pembayaran piutang"
      : "Terima pembayaran invoice B2B";

  return (
    <Modal
      title={label}
      description={`${target.title} — sisa ${rupiah(target.remaining)}. Boleh dicicil / bayar sebagian.`}
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pay-amount">Nominal (Rp) *</label>
            <input
              className="input"
              id="pay-amount"
              name="amount"
              type="number"
              min="1"
              max={target.remaining}
              defaultValue={target.remaining}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pay-method">Metode *</label>
            <select className="select" id="pay-method" name="paymentMethod" defaultValue="TUNAI">
              <option value="TUNAI">Tunai</option>
              <option value="TRANSFER">Transfer</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="pay-proof">Bukti pembayaran (Opsional, JPG/PNG/PDF max 5MB)</label>
            <input
              className="input"
              id="pay-proof"
              name="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
          </div>
          <div className="field full">
            <label htmlFor="pay-notes">Catatan</label>
            <textarea
              className="textarea"
              id="pay-notes"
              name="notes"
              placeholder="Contoh: Transfer BCA a/n Pelanggan, cicilan 1 dari 2"
            />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Simpan pembayaran" />
      </form>
    </Modal>
  );
}
