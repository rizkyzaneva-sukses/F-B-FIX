import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Check, Sparkles } from "lucide-react";
import { backendRequest } from "@/lib/client-api";
import type { PlanState, UserRole } from "@/lib/types";

export function CashierModal({
  cashiers,
  plan,
  onClose,
  onSaved,
}: {
  cashiers: Array<{ id: string; name: string; role: UserRole; is_active: boolean }>;
  plan: PlanState;
  onClose: () => void;
  onSaved: (cashier: { id: string; name: string; role: UserRole; is_active: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"KASIR" | "GUDANG" | "FINANCE">("KASIR");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isFree = plan.name !== "PRO";
  const hasCashier = cashiers.some((c) => c.role === "KASIR" && c.is_active);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nama staff wajib diisi.");
    if (!/^\d{6}$/.test(pin)) return setError("PIN harus 6 digit angka.");
    if (isFree && role !== "KASIR") {
      return setError("Role Gudang dan Finance hanya tersedia untuk paket PRO.");
    }
    if (isFree && hasCashier) {
      return setError("Paket Free hanya dapat memiliki 1 akun Kasir. Upgrade ke PRO untuk menambah staf.");
    }

    setLoading(true);
    try {
      const result = await backendRequest<{
        id: string;
        name: string;
        role: UserRole;
        is_active: boolean;
      }>("/api/cashiers", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), pin, role }),
      });
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah akun staff.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case "KASIR":
        return <span className="badge badge-blue">Kasir & Sales</span>;
      case "GUDANG":
        return <span className="badge badge-amber">Gudang & Produksi</span>;
      case "FINANCE":
        return <span className="badge badge-emerald">Admin & Finance</span>;
      default:
        return <span className="badge badge-green">Owner</span>;
    }
  };

  return (
    <Modal
      title="Kelola Tim & Akun Staff"
      description={
        isFree
          ? "Paket Free mencakup 1 Owner + 1 Kasir. Upgrade ke PRO untuk mengaktifkan 4 Role tim."
          : "Kelola akun staff operasional (Kasir, Gudang, Finance) dengan PIN 6 digit."
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="staff-name">Nama lengkap staff *</label>
            <input
              className="input"
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rina / Budi / Siti"
              required
            />
          </div>

          <div className="field full">
            <label htmlFor="staff-role">Role & Tanggung Jawab *</label>
            <select
              className="select"
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "KASIR" | "GUDANG" | "FINANCE")}
              required
            >
              <option value="KASIR">🛒 Kasir & Sales (POS, B2B Order, Pelanggan)</option>
              <option value="GUDANG" disabled={isFree}>
                👨‍🍳 Gudang & Produksi (Bahan, Resep Batch, Beli Bahan) {isFree ? "— (Khusus PRO)" : ""}
              </option>
              <option value="FINANCE" disabled={isFree}>
                💼 Admin & Finance (Piutang, Kas, Laporan Keuangan) {isFree ? "— (Khusus PRO)" : ""}
              </option>
            </select>
          </div>

          <div className="field full">
            <label htmlFor="staff-pin">PIN 6 digit angka *</label>
            <input
              className="input"
              id="staff-pin"
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

        {isFree && (
          <div className="callout" style={{ marginTop: 12 }}>
            <Sparkles size={17} style={{ flexShrink: 0 }} />
            <div>
              <strong>Multi-Role Khusus PRO</strong>
              <p>Paket PRO membuka role Gudang & Finance serta staf tanpa batas.</p>
            </div>
          </div>
        )}

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
            {loading ? "Menyimpan..." : "Tambah Staff"}
            <Check size={16} />
          </button>
        </div>
      </form>

      {cashiers.length > 0 && (
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <h3 style={{ fontSize: 13, marginBottom: 10 }}>Daftar Staff Aktif ({cashiers.length})</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {cashiers.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--surface-muted)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: 12 }}>{c.name}</strong>
                    <div style={{ marginTop: 2 }}>{getRoleBadge(c.role || "KASIR")}</div>
                  </div>
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
