"use client";

import { useState } from "react";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { backendRequest } from "@/lib/client-api";

const freeFeatures = [
  "50 transaksi POS/bulan",
  "30 produk jadi",
  "10 bahan baku",
  "Dashboard laba rugi",
  "Cetak struk thermal",
  "1 akun kasir",
];

const proFeatures = [
  "Transaksi POS tanpa batas",
  "Produk jadi tanpa batas",
  "Bahan baku tanpa batas",
  "Dashboard laba rugi lengkap",
  "Cetak struk thermal",
  "Akun kasir tanpa batas",
  "Laporan arus kas & neraca",
  "Export CSV & PDF",
  "Prioritas support",
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backendRequest<{
        redirectUrl?: string;
        snapToken?: string;
      }>("/api/subscription", { method: "POST" });

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else if (result.snapToken) {
        // @ts-expect-error Midtrans Snap global
        window.snap?.pay(result.snapToken, {
          onSuccess: () => (window.location.href = "/?payment=success"),
          onPending: () => (window.location.href = "/?payment=pending"),
          onError: () => setError("Pembayaran gagal. Silakan coba lagi."),
          onClose: () => setLoading(false),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pembayaran.");
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section style={{ maxWidth: 800, width: "100%", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p className="eyebrow">Harga sederhana, transparan</p>
          <h1 style={{ fontSize: 32, margin: "8px 0" }}>Pilih paket yang tepat</h1>
          <p style={{ color: "#64748b", maxWidth: 480, margin: "0 auto" }}>
            Mulai gratis, upgrade kapan saja. Tidak ada kontrak, batalkan kapan saja.
          </p>
        </div>

        {error && (
          <div className="callout error" style={{ marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {/* FREE Plan */}
          <div className="card card-pad" style={{ border: "2px solid #e2e8f0" }}>
            <div style={{ marginBottom: 24 }}>
              <span className="badge badge-emerald">Gratis</span>
              <h2 style={{ fontSize: 28, margin: "12px 0 4px" }}>FREE</h2>
              <p style={{ color: "#64748b" }}>Untuk memulai dan mencoba</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 800 }}>Rp 0</span>
              <span style={{ color: "#64748b" }}>/bulan</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
              {freeFeatures.map((feature) => (
                <li key={feature} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <Check size={16} color="#047857" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href="/register"
              className="button button-secondary"
              style={{ width: "100%", textAlign: "center", display: "block" }}
            >
              Daftar Gratis
            </a>
          </div>

          {/* PRO Plan */}
          <div
            className="card card-pad"
            style={{
              border: "2px solid #047857",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 12,
                right: -28,
                background: "#047857",
                color: "white",
                padding: "4px 40px",
                fontSize: 11,
                fontWeight: 700,
                transform: "rotate(45deg)",
              }}
            >
              POPULER
            </div>
            <div style={{ marginBottom: 24 }}>
              <span className="badge" style={{ background: "#047857", color: "white" }}>
                <Sparkles size={12} /> PRO
              </span>
              <h2 style={{ fontSize: 28, margin: "12px 0 4px" }}>PRO</h2>
              <p style={{ color: "#64748b" }}>Untuk usaha yang serius</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 800 }}>Rp 99.000</span>
              <span style={{ color: "#64748b" }}>/bulan</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
              {proFeatures.map((feature) => (
                <li key={feature} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <Check size={16} color="#047857" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              className="button button-primary"
              style={{ width: "100%" }}
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? "Memproses..." : "Upgrade ke PRO"} <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <a href="/login" style={{ color: "#047857", fontWeight: 600 }}>
            ← Kembali ke login
          </a>
        </div>
      </section>
    </main>
  );
}
