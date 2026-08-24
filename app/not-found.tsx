import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc", color: "#0f172a", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <section style={{ maxWidth: 420, textAlign: "center" }}>
        <p style={{ color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>404 / tidak ditemukan</p>
        <h1 style={{ fontSize: 28, margin: "8px 0" }}>Halaman tidak tersedia</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>Kembali ke ruang kerja untuk melanjutkan operasional.</p>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 16px", borderRadius: 10, color: "white", background: "#047857", fontWeight: 700 }}>Kembali ke dashboard</Link>
      </section>
    </main>
  );
}
