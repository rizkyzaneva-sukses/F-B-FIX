import { Modal, ModalFooter } from "@/components/ui/modal";
import { rupiah } from "@/lib/format";
import type { SalesOrder } from "@/lib/types";
import type { FormEvent } from "react";

export function B2BInvoiceModal({
  orders,
  onClose,
  onSave,
}: {
  orders: SalesOrder[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal
      title="Buat Tagihan Invoice B2B"
      description="Pilih Sales Order yang sudah terkirim (Delivered) untuk menerbitkan invoice resmi."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="inv-so">Pilih Sales Order (Delivered) *</label>
            <select className="select" id="inv-so" name="salesOrderId" defaultValue="" required>
              <option value="" disabled>
                Pilih Sales Order
              </option>
              {orders.map((so) => (
                <option key={so.id} value={so.id}>
                  {so.customer_name} — {rupiah(so.total_amount)} (Termin NET {so.payment_terms_days}{" "}
                  hari)
                </option>
              ))}
            </select>
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Terbitkan Invoice" />
      </form>
    </Modal>
  );
}
