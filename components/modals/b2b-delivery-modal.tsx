import { Modal, ModalFooter } from "@/components/ui/modal";
import { rupiah, dateLabel } from "@/lib/format";
import type { SalesOrder } from "@/lib/types";
import type { FormEvent } from "react";

export function B2BDeliveryModal({
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
      title="Buat Surat Jalan Pengiriman"
      description="Pilih Sales Order yang sudah dikonfirmasi untuk dibuatkan surat jalan."
      onClose={onClose}
    >
      <form onSubmit={onSave}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="do-so">Pilih Sales Order (Confirmed) *</label>
            <select className="select" id="do-so" name="salesOrderId" defaultValue="" required>
              <option value="" disabled>
                Pilih Sales Order
              </option>
              {orders.map((so) => (
                <option key={so.id} value={so.id}>
                  {so.customer_name} — {rupiah(so.total_amount)} ({dateLabel(so.order_date)})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="do-driver">Nama Driver / Kurir</label>
            <input
              className="input"
              id="do-driver"
              name="driverName"
              placeholder="Contoh: Pak Joko"
            />
          </div>

          <div className="field">
            <label htmlFor="do-notes">Catatan Pengiriman</label>
            <input
              className="input"
              id="do-notes"
              name="notes"
              placeholder="Contoh: Titip di pos security"
            />
          </div>
        </div>
        <ModalFooter onClose={onClose} submitLabel="Buat Surat Jalan" />
      </form>
    </Modal>
  );
}
