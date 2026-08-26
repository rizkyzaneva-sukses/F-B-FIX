import { Printer, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { rupiah } from "@/lib/format";
import type { CartItem, PaymentMethod, BusinessProfile } from "@/lib/types";

export function ReceiptModal({
  sale,
  businessProfile,
  onClose,
  onPrint,
}: {
  sale: {
    id: string;
    subtotal: number;
    discount: number;
    total: number;
    method: PaymentMethod;
    paid: number;
    change: number;
    items: CartItem[];
  };
  businessProfile?: BusinessProfile;
  onClose: () => void;
  onPrint: () => void;
}) {
  const currentDate = new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const handleShare = () => {
    const text = `*${businessProfile?.name || "DapurKasir"}*\nStruk: ${sale.id}\nTanggal: ${currentDate}\nTotal: ${rupiah(
      sale.total
    )}\nMetode: ${sale.method}\nTerima kasih!`;

    if (navigator.share) {
      navigator.share({ title: "Struk Pembelian", text }).catch(() => undefined);
    } else {
      navigator.clipboard?.writeText(text);
      alert("Detail struk berhasil disalin ke clipboard.");
    }
  };

  return (
    <Modal
      title="Transaksi Berhasil"
      description={`Nomor transaksi: ${sale.id}`}
      onClose={onClose}
    >
      <div className="receipt">
        <div className="receipt-head">
          <strong>{(businessProfile?.name || "DAPURKASIR").toUpperCase()}</strong>
          {businessProfile?.address && <span>{businessProfile.address}</span>}
          {businessProfile?.phone && <span>Telp: {businessProfile.phone}</span>}
          <span>{currentDate}</span>
          <span style={{ fontSize: 10, color: "var(--muted)", display: "block", marginTop: 2 }}>
            {sale.id}
          </span>
        </div>

        {sale.items.map((item) => (
          <div className="receipt-line" key={item.id}>
            <span>
              {item.name} x{item.qty}
            </span>
            <strong>{rupiah(item.price * item.qty)}</strong>
          </div>
        ))}

        <div className="receipt-line" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #cbd5e1" }}>
          <span>Subtotal</span>
          <strong>{rupiah(sale.subtotal)}</strong>
        </div>

        {sale.discount > 0 && (
          <div className="receipt-line">
            <span>Diskon</span>
            <strong>-{rupiah(sale.discount)}</strong>
          </div>
        )}

        <div className="receipt-line receipt-total">
          <span>TOTAL</span>
          <strong>{rupiah(sale.total)}</strong>
        </div>

        <div className="receipt-line">
          <span>Bayar ({sale.method})</span>
          <span>{rupiah(sale.paid)}</span>
        </div>

        {sale.change > 0 && (
          <div className="receipt-line">
            <span>Kembalian</span>
            <strong>{rupiah(sale.change)}</strong>
          </div>
        )}

        <div className="receipt-foot">
          {businessProfile?.receipt_footer || "Terima kasih sudah mendukung usaha lokal."}
        </div>
      </div>

      <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 16 }}>
        <button type="button" className="button button-secondary" onClick={onPrint}>
          <Printer size={16} />
          Cetak struk
        </button>
        <button type="button" className="button button-primary" onClick={handleShare}>
          <Share2 size={16} />
          Bagikan struk
        </button>
      </div>

      <button
        type="button"
        className="button button-ghost"
        style={{ width: "100%", marginTop: 8 }}
        onClick={onClose}
      >
        Transaksi Baru (Selesai)
      </button>
    </Modal>
  );
}
