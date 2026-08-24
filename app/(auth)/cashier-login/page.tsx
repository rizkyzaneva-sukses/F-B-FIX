"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STORE_KEY = "dapurkasir-store-id";

function CashierLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [businessId, setBusinessId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // The owner shares /cashier-login?b=<business id> once; the tablet remembers it so
  // the cashier only ever types a PIN afterwards.
  useEffect(() => {
    const fromLink = params.get("b");
    if (fromLink) {
      window.localStorage.setItem(STORE_KEY, fromLink);
      setBusinessId(fromLink);
      return;
    }
    setBusinessId(window.localStorage.getItem(STORE_KEY) || "");
  }, [params]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!businessId.trim()) return setError("Kode toko belum diisi. Minta tautan kasir dari pemilik.");
    if (!/^\d{6}$/.test(pin)) return setError("PIN harus 6 angka.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/cashier-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId.trim(), pin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Login kasir gagal");
      window.localStorage.setItem(STORE_KEY, businessId.trim());
      router.push("/");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Login kasir gagal");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const press = (digit: string) => setPin((current) => (current.length >= 6 ? current : current + digit));

  return <main className="auth-page"><section className="auth-card">
    <div className="brand"><div className="brand-mark">DK</div><div><span className="brand-name">DapurKasir</span><span className="brand-sub">mode kasir</span></div></div>
    <div className="auth-heading">
      <p className="eyebrow">Shift kasir</p>
      <h1>Masuk dengan PIN</h1>
      <p>Masukkan PIN 6 angka yang diberikan pemilik usaha.</p>
    </div>
    <form onSubmit={submit} className="auth-form">
      {!businessId && (
        <div className="field">
          <label htmlFor="business">Kode toko</label>
          <input className="input" id="business" value={businessId} onChange={(event) => setBusinessId(event.target.value)} placeholder="Tempel kode dari pemilik" />
        </div>
      )}
      <div className="field">
        <label htmlFor="pin">PIN</label>
        <input className="input" id="pin" inputMode="numeric" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="......" style={{ letterSpacing: ".5em", textAlign: "center", fontSize: 20 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button type="button" key={digit} className="button button-secondary" onClick={() => press(digit)}>{digit}</button>
        ))}
        <button type="button" className="button button-ghost" onClick={() => setPin("")}>Hapus</button>
        <button type="button" className="button button-secondary" onClick={() => press("0")}>0</button>
        <button type="button" className="button button-ghost" onClick={() => setPin((current) => current.slice(0, -1))}>←</button>
      </div>
      {error && <div className="callout error">{error}</div>}
      <button className="button button-primary" style={{ width: "100%" }} disabled={loading}>{loading ? "Memeriksa..." : "Mulai shift"}</button>
    </form>
    <p className="auth-foot">Pemilik usaha? <a href="/login">Masuk dengan email</a></p>
  </section></main>;
}

export default function CashierLoginPage() {
  return <Suspense fallback={null}><CashierLoginContent /></Suspense>;
}
