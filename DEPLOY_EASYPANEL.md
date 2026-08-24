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
APP_URL=https://kasir.domainkamu.com
APP_PORT=3000
```

`POSTGREST_JWT_SECRET` harus sama untuk PostgREST dan service web. Jangan masukkan secret JWT ke variable yang diawali `NEXT_PUBLIC_`.

## 3. Domain dan health check

1. Arahkan domain ke service `web` pada port container `3000`.
2. Aktifkan HTTPS dari EasyPanel.
3. Health check aplikasi: `GET /`.
4. PostgREST cukup internal dan tidak perlu diekspos ke internet.

## 4. Migrasi database

Migration pertama dijalankan otomatis hanya ketika volume PostgreSQL masih kosong. Untuk perubahan migration berikutnya, masuk ke terminal service PostgreSQL dan jalankan file SQL secara eksplisit:

```bash
psql "$DATABASE_URL" -f /path/001_dapurkasir.sql
```

Sebelum migration production, backup volume/database terlebih dahulu.

## 5. Alur penggunaan

1. Buka `/register` untuk membuat owner dan bisnis pertama.
2. Login melalui `/login`.
3. Buat produk, bahan baku, supplier, dan pelanggan.
4. Buat batch produksi.
5. Jalankan transaksi dari menu Kasir POS.

## Catatan keamanan

- RLS membatasi data berdasarkan `business_id` dari JWT.
- Password owner dan PIN kasir disimpan sebagai bcrypt hash.
- Cookie session bersifat `httpOnly`, `sameSite=lax`, dan `secure` pada production.
- Service role hanya dipakai server-side saat proses registrasi dan tidak dikirim ke browser.
- Ganti seluruh password dan secret contoh sebelum deploy.
