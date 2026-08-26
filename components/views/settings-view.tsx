import {
  Check,
  ChevronRight,
  CreditCard,
  Printer,
  QrCode,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { CashierModal } from "@/components/modals/cashier-modal";
import { backendRequest } from "@/lib/client-api";
import type { BusinessProfile, Toast } from "@/lib/types";

export function SettingsView({
  dark,
  setDark,
  notify,
  onReset,
  onSeed,
  businessProfile,
  onSaveProfile,
}: {
  dark: boolean;
  setDark: (value: boolean) => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onReset: () => Promise<void>;
  onSeed: () => Promise<void>;
  businessProfile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => Promise<void>;
}) {
  const [busy, setBusy] = useState<"reset" | "seed" | null>(null);
  const [subscription, setSubscription] = useState<{ currentPlan: string; proPrice: number } | null>(null);
  const [cashiers, setCashiers] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [profileForm, setProfileForm] = useState(businessProfile);
  const [businessId, setBusinessId] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileForm(businessProfile);
  }, [businessProfile]);

  useEffect(() => {
    backendRequest<{ currentPlan: string; proPrice: number }>("/api/subscription")
      .then(setSubscription)
      .catch(() => undefined);
    backendRequest<Array<{ id: string; name: string; is_active: boolean }>>("/api/cashiers")
      .then(setCashiers)
      .catch(() => undefined);
    backendRequest<{ business_id?: string }>("/api/auth/session")
      .then((data) => setBusinessId(String(data?.business_id || "")))
      .catch(() => undefined);
  }, []);

  const runTrialAction = async (kind: "reset" | "seed", action: () => Promise<void>) => {
    setBusy(kind);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim()) return notify("Nama usaha wajib diisi.", "error");
    setSavingProfile(true);
    try {
      await onSaveProfile(profileForm);
    } catch {
      // already notifies
    } finally {
      setSavingProfile(false);
    }
  };

  const cashierLoginUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/cashier-login?b=${businessId}`
      : "";

  return (
    <main className="page">
      <PageHeading
        eyebrow="Workspace"
        title="Pengaturan Aplikasi"
        description="Atur identitas usaha, tim kasir, printer thermal, dan paket langganan."
        action={
          <button
            className="button button-primary"
            disabled={savingProfile}
            onClick={saveProfile}
          >
            <Check size={16} />
            {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        }
      />

      <div className="split-grid">
        <section className="card card-pad">
          <div className="section-header">
            <div>
              <h2>Paket Langganan</h2>
              <p>Kelola paket dan kuota transaksi</p>
            </div>
            <CreditCard size={18} color="var(--primary)" />
          </div>
          <div className="activity-row">
            <div className="row-main">
              <strong>Paket saat ini</strong>
              <span>{subscription?.currentPlan || "FREE"}</span>
            </div>
            <span
              className={`badge ${
                subscription?.currentPlan === "PRO" ? "badge-green" : "badge-emerald"
              }`}
            >
              {subscription?.currentPlan || "FREE"}
            </span>
          </div>
          {subscription?.currentPlan !== "PRO" && (
            <>
              <div className="callout" style={{ marginTop: 12 }}>
                <Sparkles size={17} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Upgrade ke PRO</strong>
                  <p>Transaksi tanpa batas, produk unlimited, dan fitur lengkap.</p>
                </div>
              </div>
              <a
                href="/pricing"
                className="button button-primary"
                style={{ width: "100%", marginTop: 12, textAlign: "center", display: "flex" }}
              >
                Upgrade ke PRO <ChevronRight size={14} />
              </a>
            </>
          )}
        </section>

        <section className="card card-pad">
          <div className="section-header">
            <div>
              <h2>Profil Usaha</h2>
              <p>Tampil di bagian atas struk kasir</p>
            </div>
            <Store size={18} color="var(--primary)" />
          </div>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="business">Nama usaha *</label>
              <input
                className="input"
                id="business"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Nomor telepon / WA</label>
              <input
                className="input"
                id="phone"
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="paper">Lebar kertas printer</label>
              <select
                className="select"
                id="paper"
                value={profileForm.paper_width}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    paper_width: Number(event.target.value) === 80 ? 80 : 58,
                  }))
                }
              >
                <option value="58">58 mm (Standar Portable)</option>
                <option value="80">80 mm (Desktop POS)</option>
              </select>
            </div>
            <div className="field full">
              <label htmlFor="address">Alamat usaha</label>
              <textarea
                className="textarea"
                id="address"
                value={profileForm.address}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, address: event.target.value }))
                }
              />
            </div>
            <div className="field full">
              <label htmlFor="footer">Catatan kaki (Footer) struk</label>
              <input
                className="input"
                id="footer"
                value={profileForm.receipt_footer}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    receipt_footer: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </section>

        <div className="dashboard-stack">
          <section className="card card-pad">
            <div className="section-header">
              <div>
                <h2>Printer Thermal Bluetooth</h2>
                <p>Koneksi cetak struk langsung</p>
              </div>
              <Printer size={18} color="var(--primary)" />
            </div>
            <div className="callout success">
              <Check size={17} style={{ flexShrink: 0 }} />
              <div>
                <strong>Struk Digital & Thermal Siap</strong>
                <p>Cetak via dialog browser atau hubungkan printer Bluetooth.</p>
              </div>
            </div>
            <button
              className="button button-secondary"
              style={{ width: "100%", marginTop: 14 }}
              onClick={() => notify("Browser akan meminta izin Bluetooth saat printer dipilih.", "default")}
            >
              <Printer size={16} />
              Hubungkan Printer Bluetooth
            </button>
          </section>

          <section className="card card-pad">
            <div className="section-header">
              <div>
                <h2>Tampilan Tema</h2>
                <p>Sesuaikan kenyamanan kerja</p>
              </div>
              <Sparkles size={17} color="var(--primary)" />
            </div>
            <div className="activity-row">
              <div className="row-main">
                <strong>Mode Gelap (Dark Mode)</strong>
                <span>Lebih nyaman untuk shift malam dan menghemat daya</span>
              </div>
              <button
                className={`button ${dark ? "button-primary" : "button-secondary"}`}
                onClick={() => setDark(!dark)}
              >
                {dark ? "Aktif" : "Nonaktif"}
              </button>
            </div>
          </section>

          <section className="card card-pad">
            <div className="section-header">
              <div>
                <h2>Tim Kasir ({cashiers.length})</h2>
                <p>Kelola kasir & PIN login</p>
              </div>
              <button className="section-link" onClick={() => setShowCashierModal(true)}>
                Kelola
              </button>
            </div>
            {cashiers.length > 0 ? (
              cashiers.map((c) => (
                <div className="activity-row" key={c.id}>
                  <div className="avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                  <div className="row-main">
                    <strong>{c.name}</strong>
                    <span>Kasir &middot; {c.is_active ? "Aktif" : "Nonaktif"}</span>
                  </div>
                  <span
                    className="status-dot"
                    style={{ background: c.is_active ? "var(--success)" : "var(--muted)" }}
                  />
                </div>
              ))
            ) : (
              <p className="table-muted">Belum ada akun kasir terdaftar.</p>
            )}
            <button
              className="button button-secondary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => setShowCashierModal(true)}
            >
              + Tambah Kasir Baru
            </button>
            {businessId && (
              <div className="callout" style={{ marginTop: 12 }}>
                <QrCode size={17} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Tautan Masuk Khusus Kasir</strong>
                  <p
                    style={{
                      wordBreak: "break-all",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 11,
                      margin: "4px 0 8px",
                    }}
                  >
                    {cashierLoginUrl}
                  </p>
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(cashierLoginUrl).then(
                        () => notify("Tautan kasir berhasil disalin."),
                        () => notify("Gagal menyalin tautan.", "error")
                      );
                    }}
                  >
                    Salin Tautan Kasir
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="card card-pad">
            <div className="section-header">
              <div>
                <h2>Pemeliharaan Data</h2>
                <p>Opsi reset dan data awal</p>
              </div>
              <SlidersHorizontal size={17} color="var(--primary)" />
            </div>
            <button
              className="button button-secondary"
              style={{ width: "100%", marginTop: 10 }}
              disabled={busy !== null}
              onClick={() => runTrialAction("seed", onSeed)}
            >
              <Sparkles size={16} />
              {busy === "seed" ? "Menyiapkan Data..." : "Muat Data Awal"}
            </button>
            <button
              className="button button-danger"
              style={{ width: "100%", marginTop: 10 }}
              disabled={busy !== null}
              onClick={() => runTrialAction("reset", onReset)}
            >
              <Trash2 size={16} />
              {busy === "reset" ? "Menghapus..." : "Kosongkan Semua Data"}
            </button>
          </section>
        </div>
      </div>

      {showCashierModal && (
        <CashierModal
          cashiers={cashiers}
          onClose={() => setShowCashierModal(false)}
          onSaved={(newCashier) => {
            setCashiers((prev) => [...prev, newCashier]);
            setShowCashierModal(false);
            notify("Kasir berhasil ditambahkan.");
          }}
        />
      )}
    </main>
  );
}
