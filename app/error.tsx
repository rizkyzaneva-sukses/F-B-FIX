"use client";

import { RefreshCcw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc", color: "#0f172a", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <section style={{ maxWidth: 420, textAlign: "center" }}>
        <p style={{ color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>DapurKasir</p>
        <h1 style={{ fontSize: 28, margin: "8px 0" }}>Ruang kerja sedang bermasalah</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>Data transaksi yang sudah tersimpan tetap aman. Muat ulang halaman untuk mencoba lagi.</p>
        <button onClick={() => reset()} style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", border: 0, borderRadius: 10, color: "white", background: "#047857", fontWeight: 700 }}><RefreshCcw size={16} />Muat ulang</button>
      </section>
    </main>
  );
}
