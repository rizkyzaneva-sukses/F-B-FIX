# DapurKasir — 1 app = 1 toko

Aplikasi POS + stok + produksi + keuangan untuk satu toko per instalasi.
Klien baru = klon baru (database sendiri, domain sendiri), bukan akun di aplikasi bersama.

Versi: **1.4.0** · Stack: Next.js 15 + PostgREST v12.2.12 + PostgreSQL 16/18

## Jalan di localhost

Prasyarat: Node 20+, PostgreSQL 16/18 (service Windows `postgresql-x64-18` sudah cukup). Docker tidak wajib.

```powershell
copy .env.example .env.local
npm install
npm run db:setup
npm run postgrest
```

Di terminal lain:

```powershell
npm run dev
```

Buka [http://localhost:3000/login](http://localhost:3000/login)

| | |
|---|---|
| Email | `admin@toko.local` |
| Password | `admin1234` |

Ganti password setelah login pertama. `/register`, `/pricing`, dan `/admin` mengembalikan 404 selama `SINGLE_TENANT=true`.

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health) — berisi `version` dan `last_migration`.

## Skrip operasional

| Perintah | Fungsi |
|---|---|
| `npm run db:setup` | Buat role + database lokal, jalankan migrasi |
| `npm run db:migrate` | Ulangi semua `db/migrations/*.sql` (idempotent) |
| `npm run postgrest` | Unduh + jalankan PostgREST di `:3001` |
| `npm run db:backup` | `pg_dump` ke `backups/`, retensi 30 hari |
| `npm run provision -- --name ... --domain ... --email ...` | Secret + berkas env klien baru |
| `npm run release:all` | Webhook deploy semua klien, verifikasi `/api/health` |

`clients.json` dan `clients/*.env` **jangan di-commit**.

## Deploy produksi

Lihat `DEPLOY_EASYPANEL.md`. Satu app Compose per klien, `SINGLE_TENANT=true`, owner dibuat otomatis dari env.

## Mode toko tunggal

`SINGLE_TENANT=true` (default klon):

- `register_business()` menolak toko kedua di level SQL
- Route `/register`, `/pricing`, `/api/subscription/*`, `/admin` → 404
- Limit paket FREE dilewati; `plan` dipaksa `PRO`
- Menu langganan/upgrade disembunyikan
- Saat `businesses` kosong, toko + OWNER dibuat dari `OWNER_EMAIL` / `OWNER_PASSWORD` / `BUSINESS_NAME`

Mesin multi-tenant (`business_id`, RLS) **tidak dibongkar** — kolomnya tetap ada, isinya selalu satu toko.
