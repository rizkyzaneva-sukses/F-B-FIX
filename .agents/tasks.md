```markdown
# Tasks: DapurKasir — SaaS POS, Inventori & Produksi untuk UMKM Kuliner

## 1. Proyek Setup & Konfigurasi Dasar

- [ ] 1.1 Inisialisasi repositori monorepo dengan Next.js App Router, TypeScript, Tailwind CSS, dan ESLint + Prettier; buat struktur folder `app/(auth)`, `app/(dashboard)`, `app/api/`, `lib/`, `components/`, `server-actions/`, `supabase/`.
  _Requirements: Tech Spec – Arsitektur_
  _Design: Struktur Direktori_

- [ ] 1.2 Konfigurasi Supabase client (service role + anon key) di `lib/supabase/server.ts` dan `lib/supabase/client.ts`; verifikasi koneksi ke database dev via CLI.
  _Requirements: Tech Spec – Stack Detail_
  _Design: Supabase Setup_

- [ ] 1.3 Setup Supabase Auth (email/password), aktifkan sign-up & sign-in di dashboard Supabase; buat middleware Next.js `middleware.ts` yang mengarahkan user berdasarkan role (`OWNER` → dashboard, `KASIR` → POS).
  _Requirements: US-1, AC-1.3, AC-1.5_
  _Design: Auth Flow Diagram_

- [ ] 1.4 Konfigurasi PWA: buat `manifest.json` dengan theme color, ikon maskable, orientasi portrait/landscape; daftarkan service worker minimal untuk cache aset statis dan POS shell; uji installability via Lighthouse.
  _Requirements: Tech Spec – PWA_
  _Design: PWA Manifest_

## 2. Skema Database & Migration

- [ ] 2.1 Tulis migration SQL pertama (`001_create_tables.sql`) yang membuat semua tabel utama: `businesses`, `users`, `units`, `items`, `parties`, `transactions`, `transaction_items`, `production_batches`, `production_materials`, `receivables`, `receivable_payments`, `expenses`. Semua kolom finansial bertipe `numeric(15,2)`.
  _Requirements: Tech Spec – Data Model_
  _Design: ER Diagram – Skema Lengkap_

- [ ] 2.2 Tambahkan RLS policy untuk setiap tabel yang membatasi akses berdasarkan `business_id` dari JWT Supabase Auth; buat policy untuk role `owner` (full CRUD) dan `kasir` (hanya INSERT/SELECT di transaksi dan POS-related).
  _Requirements: US-1, Tech Spec – Multi-Tenant Isolation_
  _Design: RLS Policy Matrix_

- [ ] 2.3 Buat stored procedure `deduct_stock(item_id UUID, qty NUMERIC, business_id UUID) RETURNS BOOLEAN` yang melakukan atomic UPDATE pada `items.stock_qty` dengan validasi stok cukup; buat stored procedure `apply_cogs(output_item_id UUID, cogs NUMERIC, business_id UUID)` untuk update `last_cogs`.
  _Requirements: AC-5.4, AC-6.3_
  _Design: Stored Procedure – Stock & COGS_

- [ ] 2.4 Buat migration index: unique constraint `(business_id, code)` di `units`, index pada `items(business_id, is_active)`, `transactions(business_id, occurred_at)`, `receivables(business_id, status)`.
  _Requirements: Tech Spec – Performa_
  _Design: Index Strategy_

## 3. Setup Bisnis & Satuan (Unit)

- [ ] 3.1 Buat Server Action `createBusiness(data)` yang menerima nama usaha dan membuat record `businesses` dengan `plan = 'FREE'` serta batasan default (50 transaksi, 30 produk, 10 bahan baku); setelah berhasil, arahkan ke halaman setup.
  _Requirements: US-2, AC-2.1_
  _Design: Business Creation Flow_

- [ ] 3.2 Buat Server Action `seedDefaultUnits(businessId)` yang menyisipkan satuan standar terkunci: `g`, `kg`, `ml`, `liter`, `pcs`, `botol`, `jar` dengan flag `is_locked = true`. Dipanggil otomatis setelah pembuatan bisnis (task 3.1).
  _Requirements: US-3, AC-3.1_
  _Design: Default Units Seed_

- [ ] 3.3 Bangun halaman `/onboarding/business` dengan form input nama usaha; setelah submit, tampilkan ringkasan satuan default yang telah dibuat dan arahkan ke halaman master produk.
  _Requirements: AC-1.1_
  _Design: Onboarding Wireframe_

## 4. Autentikasi Owner & Kasir

- [ ] 4.1 Buat halaman `/login` dengan form email + password, terintegrasi Supabase Auth; tampilkan pesan error spesifik untuk email terdaftar, password < 8 karakter (AC-1.2).
  _Requirements: US-1, AC-1.2, AC-1.3_
  _Design: Login Page Wireframe_

- [ ] 4.2 Buat halaman `/register` dengan validasi email, password minimal 8 karakter, konfirmasi password; setelah sukses, panggil `createBusiness` + `seedDefaultUnits` secara berurutan.
  _Requirements: US-1, AC-1.1_
  _Design: Register Flow_

- [ ] 4.3 Buat Server Action `createKasir(name, pin, businessId)` yang meng-hash PIN 6 digit (bcrypt/argon2), menyimpan record `users` dengan `role = 'KASIR'` dan `is_active = true`.
  _Requirements: US-1, AC-1.4_
  _Design: Kasir Creation Logic_

- [ ] 4.4 Buat halaman `/login/kasir` dengan input PIN numerik 6 digit; validasi against `users.pin_hash` dan business active status; keluarkan session token role kasir setelah sukses.
  _Requirements: US-1, AC-1.4_
  _Design: Kasir PIN Login Flow_

- [ ] 4.5 Tambahkan middleware guard di semua route `/dashboard/*`, `/master/*`, `/produksi/*`, `/pembelian/*`, `/laporan/*` yang menolak akses jika role = `KASIR` (kembalikan 403 dan redirect ke `/pos`).
  _Requirements: US-1, AC-1.5_
  _Design: Role Guard Middleware_

## 5. Master Satuan (CRUD)

- [ ] 5.1 Buat API endpoint `GET /api/units?businessId=` yang mengembalikan semua satuan aktif termasuk yang terkunci.
  _Requirements: US-3, AC-3.1_
  _Design: Units API_

- [ ] 5.2 Buat halaman `/master/satuan` dengan tabel daftar satuan; satuan `is_locked = true` hanya dapat dilihat, tidak diedit; sediakan form tambah satuan baru dengan dropdown pilih kode satuan (tidak boleh free-text).
  _Requirements: US-3, AC-3.2_
  _Design: Master Satuan UI_

## 6. Master Produk Jadi

- [ ] 6.1 Buat API endpoint `GET /api/items?type=product&businessId=&search=` yang mendukung pencarian FTS pada nama produk; hasil harus return dalam ≤ 200ms untuk katalog ≤ 100 item.
  _Requirements: US-3, AC-6.1_
  _Design: Product Search API_

- [ ] 6.2 Buat Server Action `createProduct(data)` dengan validasi: nama tidak kosong, unit dipilih dari dropdown, `sale_price >= 0`, `stock_qty >= 0`; tolak dengan 422 jika gagal.
  _Requirements: US-3, AC-3.3, AC-3.4_
  _Design: Product Creation Server Action_

- [ ] 6.3 Buat halaman `/master/produk` dengan tabel produk (nama, kategori, satuan, harga jual, stok, status aktif) dan tombol "Tambah Produk" yang membuka modal/form.
  _Requirements: US-3_
  _Design: Master Produk UI_

- [ ] 6.4 Buat halaman `/master/produk/[id]/edit` untuk edit produk: hanya bidang yang diizinkan diedit, stok tidak bisa diubah manual (hanya lewat produksi/pembelian/penjualan).
  _Requirements: AC-3.4_
  _Design: Product Edit Flow_

## 7. Master Bahan Baku

- [ ] 7.1 Buat Server Action `createRawMaterial(data)` dengan validasi serupa produk jadi namun field wajib: `last_buy_price >= 0`, `stock_qty >= 0`; tolak dengan 422 jika gagal.
  _Requirements: US-3, AC-3.3_
  _Design: Raw Material Creation_

- [ ] 7.2 Buat halaman `/master/bahan-baku` dengan tabel bahan baku (nama, satuan, stok, last buy price, supplier default) dan form tambah dengan dropdown satuan terkunci.
  _Requirements: US-3_
  _Design: Master Bahan Baku UI_

- [ ] 7.3 Buat quota check `checkProductCount(businessId)` dan `checkRawMaterialCount(businessId)` yang dipanggil sebelum create product/material; jika FREE dan kuota habis, kembalikan error 409.
  _Requirements: US-2, AC-2.3_
  _Design: Quota Guard – Items_

## 8. Master Supplier & Pelanggan (Party)

- [ ] 8.1 Buat Server Action `createParty(data)` yang menerima `party_type` (SUPPLIER/CUSTOMER), nama wajib, dan opsional: telepon, alamat, `credit_limit >= 0`.
  _Requirements: US-3, AC-3.5_
  _Design: Party Creation_

- [ ] 8.2 Buat halaman `/master/pihak` dengan tab Supplier dan Pelanggan; masing-masing menampilkan tabel dan form tambah/edit.
  _Requirements: US-3_
  _Design: Party Master UI_

## 9. Dashboard Owner

- [ ] 9.1 Buat API endpoint `GET /api/dashboard?businessId=&dateFrom=&dateTo=` yang aggregate: omzet hari ini, estimasi laba kotor, stok kritis (stok ≤ threshold), piutang jatuh tempo 7 hari ke depan.
  _Requirements: US-10, Dashboard Owner_
  _Design: Dashboard Aggregation Query_

- [ ] 9.2 Bangun halaman `/dashboard` dengan kartu ringkasan (omzet, laba, stok kritis, piutang), grafik penjualan 7 hari terakhir (Chart.js/Recharts), dan alert badge untuk piutang jatuh tempo.
  _Requirements: US-10_
  _Design: Dashboard Wireframe_

## 10. Produksi Batch & Perhitungan COGS

- [ ] 10.1 Buat Server Action `createProductionBatch(data)` yang menerima: `output_item_id`, `output_qty`, array `materials[]` (item_id, qty), `other_cost`. Validasi: output produk aktif, qty > 0, minimal 1 bahan dengan qty > 0.
  _Requirements: US-5, AC-5.1_
  _Design: Production Batch Server Action_

- [ ] 10.2 Implementasi logika COGS di dalam server action: hitung `material_cost = Σ(qty × last_buy_price)` untuk setiap bahan; `cogs_per_unit = (material_cost + other_cost) / output_qty`, bulatkan ke 2 desimal.
  _Requirements: US-5, AC-5.3_
  _Design: COGS Calculation Engine_

- [ ] 10.3 Setelah validasi COGS, eksekusi stored procedure `deduct_stock` untuk setiap bahan baku, kemudian `apply_cogs` untuk produk output, lalu INSERT ke `production_batches` dan `production_materials`. Lakukan dalam satu transaction.
  _Requirements: US-5, AC-5.4_
  _Design: Production Transaction Flow_

- [ ] 10.4 Tambahkan validasi stok pratransaksi: sebelum menyimpan batch, cek apakah semua bahan cukup; jika tidak, kembalikan error 409 dengan nama bahan dan stok tersedia.
  _Requirements: US-5, AC-5.5_
  _Design: Stock Validation for Production_

- [ ] 10.5 Bangun halaman `/produksi` dengan form produksi batch: search produk output (dropdown), input qty hasil, tabel bahan baku (search + qty + satuan terkunci), input biaya lain, preview COGS, tombol simpan.
  _Requirements: US-5, AC-5.2_
  _Design: Production Form UI_

- [ ] 10.6 Buat halaman `/produksi/riwayat` dengan tabel riwayat batch (kode batch, produk output, qty, COGS/unit, tanggal produksi).
  _Requirements: AC-5.4_
  _Design: Production History UI_

## 11. Pembelian Bahan Baku & Utang Supplier

- [ ] 11.1 Buat Server Action `createPurchase(data)` yang menerima: `party_id` (supplier), array `items[]` (item_id, qty, price), `payment_status` (LUNAS/UTANG). Hitung total pembelian; update stok dan `last_buy_price` jika LUNAS; catat utang jika UTANG.
  _Requirements: US-4, AC-4.1, AC-4.2, AC-4.3_
  _Design: Purchase Server Action_

- [ ] 11.2 Validasi purchase: wajib supplier, minimal 1 baris bahan, qty > 0, harga ≥ 0; tolak dengan 422 jika gagal (AC-4.4).
  _Requirements: US-4, AC-4.4_
  _Design: Purchase Validation_

- [ ] 11.3 Bangun halaman `/pembelian` dengan form pembelian: pilih supplier (dropdown), tambah baris bahan (search + qty + harga), pilih status bayar, preview total, tombol simpan.
  _Requirements: US-4_
  _Design: Purchase Form UI_

- [ ] 11.4 Buat halaman `/pembelian/utang` dengan rekap utang supplier: tabel berisi nama supplier, total pembelian utang, total pembayaran, sisa utang, status (BELUM_LUNAS/SEBAGIAN/LUNAS).
  _Requirements: US-4, AC-4.5_
  _Design: Supplier Debt Recap UI_

## 12. POS Kasir — Keranjang & Pencarian Produk

- [ ] 12.1 Buat Zustand store `useCartStore` dengan state: `items[]` (item_id, name, qty, price, subtotal), `searchQuery`, `searchResults[]`; sediakan action `addToCart`, `updateQty`, `removeFromCart`, `clearCart`, `setSearchQuery`.
  _Requirements: US-6, AC-6.1, AC-6.2_
  _Design: Cart State Store_

- [ ] 12.2 Buat API endpoint `GET /api/pos/products?search=&businessId=` dengan debounce client-side; hasil harus ≤ 200ms untuk katalog ≤ 100 produk.
  _Requirements: US-6, AC-6.1_
  _Design: POS Product Search API_

- [ ] 12.3 Bangun layout POS `/pos` mobile/tablet-first: sidebar kiri (grid produk + search bar), panel kanan (keranjang besar dengan tombol +/- per baris, subtotal otomatis).
  _Requirements: US-6, AC-6.2_
  _Design: POS Layout Wireframe_

- [ ] 12.4 Implementasi tombol +/- pada setiap item keranjang yang memicu `updateQty` di Zustand store; tampilkan subtotal per baris dan grand total.
  _Requirements: US-6_
  _Design: POS Cart Interaction_

- [ ] 12.5 Implementasi validasi stok di keranjang: jika qty melebihi stok tersedia, tampilkan alert "Stok tidak cukup" dan blokir penambahan lebih lanjut; owner dapat override (simpan `override_reason`).
  _Requirements: US-6, AC-6.3_
  _Design: Stock Validation in Cart_

## 13. Pembayaran Transaksi POS

- [ ] 13.1 Buat Server Action `processPOSPayment(data)` yang menerima: keranjang, `payment_method` (TUNAI/QRIS/TRANSFER/HUTANG), `party_id` (opsional untuk hutang), `cash_received` (untuk tunai), `created_by` (kasir/user ID).
  _Requirements: US-6_
  _Design: POS Payment Server Action_

- [ ] 13.2 Validasi quota transaksi POS untuk paket FREE: hitung jumlah transaksi bulan berjalan, tolak dengan 409 jika ≥ 50.
  _Requirements: US-2, AC-2.4_
  _Design: Quota Guard – POS Transaction_

- [ ] 13.3 Untuk metode TUNAI: hitung kembalian = `cash_received - total`; simpan di `transactions.change_amount`. Untuk HUTANG: buat record `receivables` dengan amount = total, due_date opsional.
  _Requirements: US-6_
  _Design: Payment Methods Logic_

- [ ] 13.4 Setelah pembayaran sukses, kurangi stok setiap item di keranjang menggunakan stored procedure `deduct_stock`, INSERT ke `transactions` dan `transaction_items`.
  _Requirements: US-6, AC-6.3_
  _Design: Post-Payment Stock Deduction_

- [ ] 13.5 Bangun modal pembayaran di POS: pilih metode (tombol besar), untuk tunai tampilkan kalkulator (input uang diterima + hitung kembalian otomatis), untuk hutang tampilkan dropdown pelanggan.
  _Requirements: US-6_
  _Design: Payment Modal UI_

## 14. Pencetakan Struk Bluetooth

- [ ] 14.1 Buat module `lib/bluetooth-printer.ts` dengan class `BluetoothPrinter` yang mengelola koneksi Web Bluetooth GATT: `connect(deviceName)`, `sendESCPOS(bytes)`, `disconnect`.
  _Requirements: US-8, AC-8.2_
  _Design: Web Bluetooth Printer Module_

- [ ] 14.2 Buat utility `buildReceiptBytes(transaction)` yang mengkonversi data transaksi (nama usaha, tanggal, kasir, daftar item, total, metode bayar, kembalian) menjadi byte array ESC/POS mendukung lebar 58mm dan 80mm.
  _Requirements: US-8, AC-8.3_
  _Design: ESC/POS Receipt Builder_

- [ ] 14.3 Integrasikan tombol "Cetak Struk" di halaman konfirmasi pembayaran POS; panggil `BluetoothPrinter.connect()` lalu `sendESCPOS()`. Tangani error koneksi dan tampilkan fallback modal struk digital (PDF/gambar).
  _Requirements: US-8, AC-8.4_
  _Design: Print Flow – POS Integration_

- [ ] 14.4 Buat halaman pengaturan printer `/pengaturan/printer` dengan tombol "Hubungkan Printer Bluetooth", daftar printer yang terhubung, dan pilihan lebar kertas (58/80 mm).
  _Requirements: US-8_
  _Design: Printer Settings UI_

## 15. Riwayat Transaksi

- [ ] 15.1 Buat API endpoint `GET /api/transactions?businessId=&dateFrom=&dateTo=&status=&method=&page=&limit=` dengan filtering dan pagination. Kasir hanya melihat transaksi miliknya atau hari ini.
  _Requirements: US-6_
  _Design: Transaction History API_

- [ ] 15.2 Bangun halaman `/riwayat-transaksi` dengan tabel transaksi (tanggal, jenis, pelanggan/supplier, total, metode bayar, status, kasir) dan filter tanggal/status/metode.
  _Requirements: US-6_
  _Design: Transaction History UI_

## 16. Piutang Pelanggan

- [ ] 16.1 Buat Server Action `getReceivablesSummary(businessId)` yang aggregate: total piutang per pelanggan, sisa tagihan, status (BELUM_LUNAS/SEBAGIAN/LUNAS).
  _Requirements: US-7_
  _Design: Receivables Summary Query_

- [ ] 16.2 Buat Server Action `payReceivable(receivableId, amount)` yang mengurangi `receivables.paid_amount`, update status, dan INSERT ke `receivable_payments`.
  _Requirements: US-7_
  _Design: Receivable Payment Logic_

- [ ] 16.3 Bangun halaman `/piutang` dengan daftar piutang per pelanggan (nama, sisa tagihan, due date, status, tombol "Bayar").
  _Requirements: US-7_
  _Design: Receivables UI_

## 17. Pengeluaran Operasional

- [ ] 17.1 Buat Server Action `createExpense(data)` yang menerima: `category` (dropdown), `amount >= 0`, `date`, `notes` (opsional). Simpan ke tabel `expenses`.
  _Requirements: US-9_
  _Design: Expense Creation_

- [ ] 17.2 Bangun halaman `/pengeluaran` dengan form tambah pengeluaran dan tabel riwayat (tanggal, kategori, nominal, catatan).
  _Requirements: US-9_
  _Design: Expenses UI_

## 18. Laporan Keuangan

- [ ] 18.1 Buat API endpoint `GET /api/reports/pnl?businessId=&dateFrom=&dateTo=` yang menghitung: omzet (total penjualan), COGS (dari transaksi penjualan + last_cogs), laba kotor, total pengeluaran, net profit.
  _Requirements: US-10_
  _Design: PnL Report Query_

- [ ] 18.2 Bangun halaman `/laporan/laba-rugi` dengan filter tanggal, tabel ringkasan (omzet, COGS, laba kotor, pengeluaran, net profit), dan tombol "Export CSV".
  _Requirements: US-10_
  _Design: PnL Report UI_

- [ ] 18.3 Buat endpoint `GET /api/reports/export?businessId=&dateFrom=&dateTo=&format=csv` yang generate file CSV dari data laporan PnL.
  _Requirements: US-10_
  _Design: CSV Export_

## 19. Pengaturan Usaha & Profil

- [ ] 19.1 Buat Server Action `updateBusinessProfile(data)` yang memperbarui: nama usaha, alamat, footer struk, lebar kertas default.
  _Requirements: US-11_
  _Design: Business Profile Update_

- [ ] 19.2 Bangun halaman `/pengaturan/usaha` dengan form profil usaha dan pengaturan printer.
  _Requirements: US-11_
  _Design: Business Settings UI_

- [ ] 19.3 Buat halaman `/pengaturan/paket` yang menampilkan paket aktif, pemakaian (transaksi bulan ini, produk aktif, bahan baku aktif), sisa kuota, dan tombol CTA upgrade ke PRO.
  _Requirements: US-2, AC-2.2_
  _Design: Package Settings UI_

## 20. Error Handling, Loading State & Polish

- [ ] 20.1 Tambahkan global error boundary di Next.js App Router (`error.tsx`, `not-found.tsx`) dengan pesan ramah untuk semua halaman.
  _Requirements: Polish_
  _Design: Error Boundaries_

- [ ] 20.2 Tambahkan loading skeleton pada semua halaman yang mengambil data server: dashboard, POS produk, riwayat transaksi, laporan.
  _Requirements: UX Polish_
  _Design: Loading States_

- [ ] 20.3 Implementasikan toast/notification system (sonner/react-hot-toast) untuk semua feedback: sukses simpan, error validasi, gagal print, quota exceeded.
  _Requirements: UX Polish_
  _Design: Toast Notifications_

- [ ] 20.4 Tambahkan meta tags (title, description, Open Graph, Twitter Card) dan JSON-LD (`SoftwareApplication`, `FAQPage`) di halaman publik (landing, fitur, harga, FAQ). Tambahkan `noindex` pada halaman app setelah login.
  _Requirements: Tech Spec – SEO_
  _Design: SEO Meta Configuration_

## 21. Deploy & CI/CD

- [ ] 21.1 Setup GitHub Actions pipeline: `npm run lint → npm run typecheck → npm run test → npm run build → supabase db push (staging)` dengan environment variable dari GitHub Secrets.
  _Requirements: Tech Spec – CI/CD_
  _Design: CI/CD Pipeline_

- [ ] 21.2 Deploy ke Vercel dengan environment dev/staging/prod; setup custom domain; verifikasi PWA installability dan Core Web Vitals.
  _Requirements: Tech Spec – Hosting_
  _Design: Vercel Deployment_

## Validation Checklist

- [ ] **Build sukses**: `npm run build` tidak menghasilkan error TypeScript atau runtime.
- [ ] **Happy path onboarding**: Registrasi → login → setup bisnis → buat produk → buat bahan → produksi batch → POS transaksi → bayar → cetak struk selesai tanpa error.
- [ ] **Happy path piutang**: Transaksi hutang → lihat di piutang → bayar sebagian → status update → lunas.
- [ ] **Happy path pembelian**: Buat pembelian LUNAS (stok bertambah) dan UTANG (stok bertambah + utang tercatat).
- [ ] **Happy path laporan**: Filter tanggal → lihat PnL → export CSV berhasil diunduh.
- [ ] **Edge case – quota FREE**: Coba simpan produk ke-31 → dapat 409. Coba transaksi POS ke-51 → dapat 409 + pesan blok.
- [ ] **Edge case – stok kurang**: Kasir tambahkan qty melebihi stok → alert "Stok tidak cukup". Owner production bahan tidak cukup → 409 dengan detail.
- [ ] **Edge case – kasir akses forbidden**: Login sebagai kasir, akses `/dashboard` → 403 redirect ke `/pos`.
- [ ] **Edge case – validasi form kosong**: Submit produk tanpa nama/satuan/harga → 422 dengan pesan spesifik per field.
- [ ] **Edge case – printer gagal**: Disconnect printer saat print → fallback modal struk digital muncul.
- [ ] **Edge case – kasir hanya lihat hari ini**: Kasir buka `/riwayat-transaksi` → hanya transaksi hari ini yang tampil.
- [ ] **Performa**: Pencarian produk 100 item ≤ 200ms (uji dengan DevTools Network).
- [ ] **PWA**: Bisa di-install ke home screen, service worker cache aset statis.
```