# Deploy DapurKasir di EasyPanel

## 1. Buat aplikasi

1. Push folder project ini ke GitHub/GitLab.
2. Di EasyPanel pilih **Create App → Compose**.
3. Hubungkan repository dan pilih file `docker-compose.yml`.
4. Buat volume persistent untuk service `postgres`. Compose sudah menyiapkan volume `dapurkasir_pgdata`.

## 2. Environment wajib

Isi environment pada aplikasi EasyPanel:

```env
POSTGRES_DB=dapurkasir
POSTGRES_USER=dapurkasir
POSTGRES_PASSWORD=gunakan-password-random-panjang
POSTGREST_JWT_SECRET=gunakan-secret-random-minimal-32-karakter
SESSION_SECRET=gunakan-secret-lain-minimal-32-karakter
APP_URL=https://klien.domainkamu.com
APP_PORT=3000
APP_VERSION=1.4.0
SINGLE_TENANT=true
OWNER_EMAIL=owner@klien.com
OWNER_PASSWORD=password-awal-minimal-8
OWNER_NAME=Owner
BUSINESS_NAME=Nama Toko Klien
```

Jangan pakai generator secret manual. Jalankan:

```bash
node scripts/provision-client.mjs --name "Nama Toko" --domain klien.domainkamu.com --email owner@klien.com
```

Berkas `clients/<id>.env` siap tempel. `SESSION_SECRET` dan `POSTGREST_JWT_SECRET` **harus berbeda**.

`POSTGREST_JWT_SECRET` harus sama untuk PostgREST dan service web. Jangan masukkan secret JWT ke variable yang diawali `NEXT_PUBLIC_`.

**Penting soal isi value.** EasyPanel hanya minta nilainya, bukan barisnya. Kalau kolom value diisi `POSTGREST_URL=http://postgrest:3001`, aplikasi akan gagal dengan `Failed to parse URL from POSTGREST_URL=http://postgrest:3001/...`. Isi cukup `http://postgrest:3001`. Sejak versi ini prefix nyasar seperti itu otomatis dibersihkan, tapi tetap isi yang benar.

Service `postgrest` wajib jalan dengan `PGRST_JWT_ROLE_CLAIM_KEY=.db_role` (sudah ada di `docker-compose.yml`). Token user dikirim dengan `db_role: authenticated` sebagai role Postgres, sementara klaim `role` (`OWNER`/`KASIR`) dipakai oleh policy RLS. Kalau variable ini belum aktif di container lama, redeploy compose-nya dulu — tanpa itu semua request user ditolak PostgREST.

## 3. Domain dan health check

1. Arahkan domain ke service `web` pada port container `3000`.
2. Aktifkan HTTPS dari EasyPanel.
3. Health check aplikasi: `GET /api/health` — response berisi `version` (tag rilis) dan `last_migration`. Rilis belum selesai sampai semua klon melaporkan versi yang sama.
4. PostgREST cukup internal dan tidak perlu diekspos ke internet.

Jika EasyPanel menampilkan **Service is not reachable** tetapi container `web` hijau, cek log `web`. Log Next.js harus menampilkan `Local: http://...:3000` atau `Network: http://...:3000`. Kalau yang muncul port `80`, berarti runtime environment menimpa port Next.js. Compose ini sudah memaksa `PORT=3000` dan `HOSTNAME=0.0.0.0`; lakukan rebuild/redeploy agar image dan container baru memakai konfigurasi tersebut.

## 4. Migrasi database

Compose punya service `migrate` yang menjalankan **seluruh** file di `db/migrations/` secara berurutan setiap kali deploy. Semua migration ditulis idempoten (`create table if not exists`, `create or replace function`, `drop policy if exists` sebelum `create policy`), jadi aman dijalankan berulang.

Service `postgrest` menunggu `migrate` selesai sukses sebelum start. Kalau ada migration yang gagal, deploy berhenti di situ dan errornya kelihatan di log service `migrate` — bukan diam-diam terlewat seperti sebelumnya.

> Versi lama me-mount file SQL ke `/docker-entrypoint-initdb.d`, yang hanya jalan saat volume PostgreSQL masih kosong. Akibatnya setiap perubahan skema tidak pernah sampai ke database yang sudah berisi data.

Sebelum deploy production, tetap backup volume/database terlebih dahulu.

### Kalau menu kasir menolak transaksi

Migration `009_cashier_and_atomicity.sql` yang membuat `checkout_pos` bisa dipakai role KASIR. Kalau kasir masih kena error RLS, pastikan service `migrate` benar-benar jalan pada deploy terakhir.

## 5. Alat bantu trial (isi/hapus data dummy)

Selama masa uji coba, halaman **Pengaturan** punya kartu **Mode trial** dengan dua tombol:

- **Isi data dummy** — mengisi produk, bahan baku, supplier, pelanggan, batch produksi, penjualan 2 minggu terakhir, piutang, utang supplier, pengeluaran, dan modal. Data lama dihapus dulu supaya bisa ditekan berulang kali.
- **Hapus semua data** — mengosongkan seluruh data operasional bisnis yang sedang login (konfirmasi dengan mengetik `HAPUS`). Akun owner, kasir, satuan, dan langganan tetap aman.

Keduanya hanya bisa dipakai role OWNER dan selalu terbatas pada `business_id` milik sesi yang login.

Sebelum aplikasi diserahkan ke client, matikan fitur ini:

```env
TRIAL_TOOLS_ENABLED=false
```

Variable itu mematikan API (`/api/dev/seed`, `/api/dev/reset`) sekaligus menyembunyikan kartunya dari UI (lewat build arg `NEXT_PUBLIC_TRIAL_TOOLS`), jadi service `web` perlu di-rebuild setelah diubah.

## 6. Alur penggunaan (satu toko per klon)

1. Deploy. Service `migrate` jalan, lalu `web` bootstrap toko + owner dari env.
2. Buka domain klien → halaman `/login` (bukan `/register` — itu 404).
3. Login dengan `OWNER_EMAIL` / `OWNER_PASSWORD`. Minta klien ganti password.
   Untuk kasir: buka **Pengaturan → Tim kasir**, tambahkan kasir dengan PIN 6 angka, lalu salin **tautan masuk kasir** dan buka di perangkat kasir. Perangkat itu akan mengingat kode tokonya, jadi kasir cukup memasukkan PIN.
4. Buat produk, bahan baku, supplier, dan pelanggan.
5. Buat batch produksi.
6. Jalankan transaksi dari menu Kasir POS.

`/pricing`, `/admin`, dan menu upgrade **sengaja hilang**. Klien bayar per instalasi, bukan paket FREE/PRO di dalam aplikasi.

## 8. Klien baru (< 15 menit)

1. `node scripts/provision-client.mjs --name ... --domain ... --email ...`
2. EasyPanel → Create App Compose → nama `dapurkasir-<klien>`
3. Tempel env, arahkan domain, deploy
4. Cek `GET /api/health` → `version` + `last_migration` + `business_count: 1`
5. Kirim kredensial, catat klien di `clients.json` (jangan di-commit)

## 9. Rilis ke semua klon

Build **satu** image, tag semver (`v1.4.0`), jangan `latest`.

```bash
node scripts/release-all.mjs --version 1.4.0
```

Skrip memanggil webhook tiap klien lalu menunggu `/api/health` sampai versinya sama. Yang gagal dilaporkan — rilis belum selesai sampai semua hijau.

## 10. Backup & restore per klien

Di dalam klon (atau mesin yang bisa `pg_dump` ke database klon itu):

```bash
node scripts/backup-client.mjs --retention 30
```

Restore satu klien tidak menyentuh klien lain — dump-nya memang database terpisah.

```bash
pg_restore --clean --if-exists -d dapurkasir backups/dapurkasir-YYYY-MM-DD.dump
```

Uji restore beneran minimal sekali sebelum klien kedua masuk.

## 7. Catatan keamanan

- RLS membatasi data berdasarkan `business_id` dari JWT.
- Request POST/PATCH/DELETE lintas situs ditolak middleware lewat pemeriksaan header `Origin` (kecuali webhook, yang diverifikasi lewat signature Midtrans).
- Header keamanan (CSP, `X-Frame-Options`, HSTS, `Referrer-Policy`) dipasang di `next.config.ts`.
- Container `web` berjalan sebagai user `node`, bukan root.
- Halaman `/admin` dijaga middleware berdasarkan `ADMIN_EMAILS`, bukan hanya API-nya.
- Password owner dan PIN kasir disimpan sebagai bcrypt hash.
- Cookie session bersifat `httpOnly`, `sameSite=lax`, dan `secure` pada production.
- Service role hanya dipakai server-side saat proses registrasi dan tidak dikirim ke browser.
- Ganti seluruh password dan secret contoh sebelum deploy.
