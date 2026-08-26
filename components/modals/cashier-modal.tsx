import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Check } from "lucide-react";
import { backendRequest } from "@/lib/client-api";

export function CashierModal({
  cashiers,
  onClose,
  onSaved,
}: {
  cashiers: Array<{ id: string; name: string; is_active: boolean }>;
  onClose: () => void;
  onSaved: (cashier: { id: string; name: string; is_active: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nama kasir wajib diisi.");
    if (!/^\d{6}$/.test(pin)) return setError("PIN harus 6 digit angka.");
    setLoading(true);
    try {
      const result = await backendRequest<{ id: string; name: string; is_active: boolean }>(
        "/api/cashiers",
        {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), pin }),
        }
      );
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah kasir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Kelola Akun Kasir"
      description="Tambah dan kelola akun kasir dengan PIN 6 digit untuk login POS."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="cashier-name">Nama lengkap kasir *</label>
            <input
              className="input"
              id="cashier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rina Kasir Pagi"
              required
            />
          </div>
          <div className="field full">
            <label htmlFor="cashier-pin">PIN 6 digit angka *</label>
            <input
              className="input"
              id="cashier-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Contoh: 123456"
              maxLength={6}
              required
            />
          </div>
        </div>

        {error && (
          <div className="callout error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 16 }}>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Tutup
          </button>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Tambah Kasir"}
            <Check size={16} />
          </button>
        </div>
      </form>

      {cashiers.length > 0 && (
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <h3 style={{ fontSize: 13, marginBottom: 10 }}>Daftar Kasir Terdaftar</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {cashiers.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--surface-muted)",
                }}
              >
                <div>
                  <strong style={{ fontSize: 12 }}>{c.name}</strong>
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)" }}>
                    PIN: 6 digit aktif
                  </span>
                </div>
                <span className={`badge ${c.is_active ? "badge-green" : "badge-amber"}`}>
                  {c.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
