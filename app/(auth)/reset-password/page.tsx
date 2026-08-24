"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Gagal mengirim link reset");
      setSent(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Gagal mengirim link reset");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <div className="callout success"><p>Jika email <strong>{email}</strong> terdaftar, link reset password sudah dikirim. Periksa kotak masuk (dan folder spam) — link berlaku 1 jam.</p></div>;
  }

  return <form onSubmit={submit} className="auth-form">
    <div className="field"><label htmlFor="email">Email usaha</label><input className="input" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nama@usaha.com" /></div>
    {error && <div className="callout error">{error}</div>}
    <button className="button button-primary" style={{ width: "100%" }} disabled={loading}>{loading ? "Mengirim..." : "Kirim link reset"}</button>
  </form>;
}

function NewPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) return setError("Konfirmasi password belum sama.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Gagal reset password");
      router.push("/login?reset=success");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Gagal reset password");
    } finally {
      setLoading(false);
    }
  };

  return <form onSubmit={submit} className="auth-form">
    <div className="field"><label htmlFor="password">Password baru</label><input className="input" id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} placeholder="Minimal 8 karakter" /></div>
    <div className="field"><label htmlFor="confirm">Konfirmasi password</label><input className="input" id="confirm" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} /></div>
    {error && <div className="callout error">{error}</div>}
    <button className="button button-primary" style={{ width: "100%" }} disabled={loading}>{loading ? "Menyimpan..." : "Simpan password baru"}</button>
  </form>;
}

function ResetPasswordContent() {
  const token = useSearchParams().get("token");
  return <main className="auth-page"><section className="auth-card">
    <div className="brand"><div className="brand-mark">DK</div><div><span className="brand-name">DapurKasir</span><span className="brand-sub">operasional kuliner</span></div></div>
    <div className="auth-heading">
      <p className="eyebrow">{token ? "Buat password baru" : "Lupa password"}</p>
      <h1>{token ? "Atur ulang password" : "Reset password kamu"}</h1>
      <p>{token ? "Password baru berlaku untuk login berikutnya." : "Masukkan email usaha yang terdaftar, kami kirim link untuk membuat password baru."}</p>
    </div>
    {token ? <NewPasswordForm token={token} /> : <RequestResetForm />}
    <p className="auth-foot"><a href="/login">Kembali ke halaman masuk</a></p>
  </section></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordContent /></Suspense>;
}
