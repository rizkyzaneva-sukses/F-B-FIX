import { CircleDollarSign, ClipboardList, CreditCard, QrCode, Check } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { rupiah } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export function PaymentModal({
  total,
  customers,
  onCreateCustomer,
  onClose,
  onPay,
}: {
  total: number;
  customers: string[];
  onCreateCustomer: (name: string) => Promise<string | null>;
  onClose: () => void;
  onPay: (
    method: PaymentMethod,
    cash: number,
    customer: string,
    due: string,
    override: string,
    discount: number
  ) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("TUNAI");
  const [discount, setDiscount] = useState(0);
  const payableTotal = Math.max(0, total - discount);
  const [cash, setCash] = useState(payableTotal);
  const [customer, setCustomer] = useState("");
  const [due, setDue] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [override, setOverride] = useState("");
  const [creating, setCreating] = useState(false);

  const methods: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
    { id: "TUNAI", label: "Tunai", icon: CircleDollarSign },
    { id: "QRIS", label: "QRIS", icon: QrCode },
    { id: "TRANSFER", label: "Transfer", icon: CreditCard },
    { id: "HUTANG", label: "Hutang", icon: ClipboardList },
  ];

  const handleDiscountChange = (val: number) => {
    const d = Math.max(0, Math.min(val, total));
    setDiscount(d);
    const newTotal = Math.max(0, total - d);
    if (cash < newTotal || cash === payableTotal) {
      setCash(newTotal);
    }
  };

  const createCustomer = async () => {
    if (!customer.trim()) return;
    setCreating(true);
    const name = await onCreateCustomer(customer);
    if (name) setCustomer(name);
    setCreating(false);
  };

  return (
    <Modal
      title="Pembayaran POS"
      description="Pilih metode pembayaran untuk menyelesaikan transaksi kasir."
      onClose={onClose}
    >
      <div className="amount-preview">
        <span>Total tagihan</span>
        <strong>{rupiah(payableTotal)}</strong>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="discount">Diskon / Potongan Harga (Rp)</label>
        <input
          className="input"
          id="discount"
          type="number"
          min="0"
          max={total}
          value={discount || ""}
          placeholder="0"
          onChange={(event) => handleDiscountChange(Number(event.target.value) || 0)}
        />
      </div>

      <div className="modal-divider" />

      <div className="field">
        <label>Metode pembayaran</label>
        <div className="payment-methods">
          {methods.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`payment-method ${method === item.id ? "active" : ""}`}
                onClick={() => {
                  setMethod(item.id);
                  if (item.id === "TUNAI") setCash(payableTotal);
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {method === "TUNAI" && (
        <div className="form-grid" style={{ marginTop: 17 }}>
          <div className="field full">
            <label htmlFor="cash">Uang diterima (Rp)</label>
            <input
              className="input"
              id="cash"
              type="number"
              min={payableTotal}
              value={cash || ""}
              onChange={(event) => setCash(Number(event.target.value))}
            />
          </div>
          <div className="callout success field full">
            <CircleDollarSign size={17} style={{ flexShrink: 0 }} />
            <div>
              <strong>
                Kembalian {cash >= payableTotal ? rupiah(cash - payableTotal) : "Belum cukup"}
              </strong>
              <p>
                {cash >= payableTotal
                  ? "Nominal cukup. Siap menyelesaikan transaksi."
                  : `Kurang ${rupiah(payableTotal - cash)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {method === "HUTANG" && (
        <div className="form-grid" style={{ marginTop: 17 }}>
          <div className="field full">
            <label htmlFor="customer">Nama pelanggan *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                id="customer"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                list="customer-options"
                placeholder="Pilih atau ketik nama pelanggan"
                required
              />
              <button
                type="button"
                className="button button-secondary"
                disabled={
                  creating ||
                  !customer.trim() ||
                  customers.some((name) => name.toLowerCase() === customer.trim().toLowerCase())
                }
                onClick={createCustomer}
              >
                {creating ? "Menyimpan..." : "Simpan Baru"}
              </button>
            </div>
            <datalist id="customer-options">
              {customers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="field full">
            <label htmlFor="due">Jatuh tempo</label>
            <input
              className="input"
              id="due"
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </div>
          <div className="field full">
            <label htmlFor="override">Alasan override stok (jika stok minus)</label>
            <textarea
              className="textarea"
              id="override"
              value={override}
              onChange={(event) => setOverride(event.target.value)}
              placeholder="Contoh: Stok fisik masih ada di rak pajang"
            />
          </div>
        </div>
      )}

      <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 16 }}>
        <button type="button" className="button button-secondary" onClick={onClose}>
          Batal
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => onPay(method, cash, customer, due, override, discount)}
        >
          Bayar sekarang
          <Check size={16} />
        </button>
      </div>
    </Modal>
  );
}
