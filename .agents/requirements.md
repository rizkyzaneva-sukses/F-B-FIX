# Requirements: DapurKasir

## Introduction

DapurKasir adalah aplikasi web SaaS mobile/tablet-first untuk UMKM kuliner produksi yang mengintegrasikan POS, stok, pembelian bahan, produksi batch, COGS, piutang, pengeluaran, dan laporan laba rugi sederhana. Ruang lingkup rilis ini berfokus pada alur operasional harian yang lengkap agar owner dapat mengetahui kondisi keuangan usaha secara akurat, sementara kasir dapat menyelesaikan transaksi dengan cepat dan minim kesalahan.

## Requirements

### US-1: Registrasi, autentikasi, dan peran pengguna

Sebagai owner, saya ingin membuat akun usaha dan mengelola akses kasir, agar data usaha aman serta kasir dapat menggunakan POS tanpa mengakses pengaturan sensitif.

1. **AC-1.1** WHEN calon owner mendaftarkan akun dengan email dan password valid THEN sistem SHALL membuat akun autentikasi, membuat satu data bisnis baru dengan paket `FREE`, dan mengarahkan owner ke alur setup usaha.
2. **AC-1.2** IF email tidak valid, password kurang dari 8 karakter, atau email telah terdaftar THEN sistem SHALL menolak pendaftaran dengan status `422` dan menampilkan pesan validasi spesifik pada field terkait.
3. **AC-1.3** WHEN owner berhasil login menggunakan email dan password yang valid THEN sistem SHALL membuat sesi autentikasi aktif dan mengarahkan pengguna ke dashboard bisnis miliknya.
4. **AC-1.4** WHEN owner membuat akun kasir dengan nama dan PIN numerik 6 digit yang belum digunakan dalam bisnis tersebut THEN sistem SHALL menyimpan PIN dalam bentuk hash, menetapkan peran `KASIR`, dan mengaktifkan akun kasir.
5. **AC-1.5** IF pengguna berperan `KASIR` mengakses halaman dashboard keuangan, pengaturan usaha, master data, produksi, pembelian, atau laporan THEN sistem SHALL menolak akses dengan status `403` dan mengarahkan pengguna ke halaman POS.

### US-2: Pengaturan paket Gratis dan PRO

Sebagai owner, saya ingin mengetahui pemakaian dan batas paket usaha, agar saya dapat mengelola operasional atau melakukan upgrade sebelum batas tercapai.

1. **AC-2.1** WHEN bisnis baru dibuat dengan paket `FREE` THEN sistem SHALL menetapkan batas maksimal 50 transaksi penjualan POS per bulan kalender, 30 produk jadi aktif, dan 10 bahan baku aktif.
2. **AC-2.2** WHEN owner membuka halaman pengaturan paket THEN sistem SHALL menampilkan paket aktif, jumlah transaksi POS bulan berjalan, jumlah produk aktif, jumlah bahan baku aktif, dan sisa kuota masing-masing.
3. **AC-2.3** IF owner mencoba menyimpan produk jadi ke-31 pada paket `FREE` THEN sistem SHALL menolak penyimpanan dengan status `409` dan menampilkan pesan “Batas 30 produk paket Gratis telah tercapai. Upgrade ke PRO untuk menambah produk.”
4. **AC-2.4** IF kasir atau owner mencoba menyelesaikan transaksi POS ke-51 dalam bulan kalender pada paket `FREE` THEN sistem SHALL memblokir konfirmasi pembayaran, tidak mengurangi stok, dan menampilkan pesan “Batas 50 transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.”
5. **AC-2.5** WHEN paket bisnis berstatus `PRO` THEN sistem SHALL tidak menerapkan batas transaksi POS, produk jadi, maupun bahan baku.

### US-3: Pengelolaan satuan, produk, bahan baku, supplier, dan pelanggan

Sebagai owner, saya ingin mengelola master data dengan satuan yang terstandar, agar stok, harga, dan perhitungan biaya selalu konsisten.

1. **AC-3.1** WHEN owner menyelesaikan setup bisnis pertama kali THEN sistem SHALL membuat satuan standar yang terkunci minimal `g`, `kg`, `ml`, `liter`, `pcs`, `botol`, dan `jar` untuk bisnis tersebut.
2. **AC-3.2** WHEN owner membuat atau mengubah produk jadi maupun bahan baku THEN sistem SHALL mewajibkan pemilihan satuan dari dropdown satuan aktif dan SHALL NOT menyediakan input teks bebas untuk satuan.
3. **AC-3.3** IF nama item kosong, satuan tidak dipilih, harga jual produk jadi bernilai kurang dari 0, atau stok awal bernilai kurang dari 0 THEN sistem SHALL menolak penyimpanan dengan status `422` dan menampilkan alasan validasi yang spesifik.
4. **AC-3.4** WHEN owner menyimpan produk jadi dengan nama, kategori, satuan, harga jual, dan stok awal yang valid THEN sistem SHALL membuat item bertipe `PRODUCT`, menyimpan stok awal sebagai nilai numerik, dan menjadikannya tersedia untuk pencarian POS apabila statusnya aktif.
5. **AC-3.5** WHEN owner menyimpan supplier atau pelanggan dengan nama yang valid THEN sistem SHALL membuat data pihak bertipe `SUPPLIER` atau `CUSTOMER`; nomor telepon, alamat, dan limit piutang SHALL bersifat opsional, sedangkan limit piutang SHALL bernilai 0 atau lebih.

### US-4: Pembelian bahan baku dan utang supplier

Sebagai owner, saya ingin mencatat pembelian bahan baku beserta status pembayarannya, agar stok bahan, harga beli terakhir, dan utang supplier selalu terpantau.

1. **AC-4.1** WHEN owner membuat pembelian bahan baku dengan supplier, minimal satu bahan, kuantitas lebih dari 0, dan harga beli per unit lebih dari atau sama dengan 0 THEN sistem SHALL menghitung total pembelian sebagai jumlah seluruh baris pembelian.
2. **AC-4.2** WHEN pembelian bahan baku berstatus `LUNAS` disimpan THEN sistem SHALL menambah stok setiap bahan baku sesuai kuantitas yang dibeli, memperbarui `last_buy_price` sesuai harga beli terbaru, dan mencatat transaksi pembelian sebagai lunas.
3. **AC-4.3** WHEN pembelian bahan baku berstatus `UTANG` disimpan THEN sistem SHALL menambah stok setiap bahan baku, mencatat nilai utang kepada supplier, dan menandai transaksi pembelian sebagai belum lunas.
4. **AC-4.4** IF owner menyimpan pembelian tanpa supplier, tanpa baris bahan, dengan kuantitas 0, atau dengan kuantitas negatif THEN sistem SHALL menolak penyimpanan dengan status `422` dan SHALL NOT mengubah stok atau saldo utang.
5. **AC-4.5** WHEN owner membuka rekap utang supplier THEN sistem SHALL menampilkan supplier, total pembelian utang, total pembayaran, sisa utang, dan status `BELUM_LUNAS`, `SEBAGIAN`, atau `LUNAS`.

### US-5: Produksi batch dan perhitungan COGS

Sebagai owner, saya ingin mencatat produksi batch dari bahan baku menjadi produk jadi, agar stok produk bertambah dan COGS per unit dihitung otomatis.

1. **AC-5.1** WHEN owner membuat batch produksi THEN sistem SHALL mewajibkan pemilihan satu produk jadi aktif sebagai output, kuantitas hasil produksi lebih dari 0, dan minimal satu bahan baku dengan kuantitas penggunaan lebih dari 0.
2. **AC-5.2** WHEN owner memilih bahan baku pada batch produksi THEN sistem SHALL menampilkan satuan bahan yang terkunci, stok tersedia, dan harga dasar berupa `last_buy_price` bahan tersebut.
3. **AC-5.3** WHEN batch produksi valid disimpan THEN sistem SHALL menghitung `material_cost` dari total kuantitas bahan dikalikan harga dasar bahan, menghitung `cogs_per_unit` sebagai `(material_cost + other_cost) / output_qty`, dan membulatkan nilai finansial ke 2 angka desimal.
4. **AC-5.4** WHEN batch produksi valid disimpan THEN sistem SHALL mengurangi stok seluruh bahan baku yang digunakan, menambah stok produk output sebesar kuantitas hasil, memperbarui `last_cogs` produk output, dan menyimpan kode batch unik.
5. **AC-5.5** IF stok salah satu bahan baku tidak mencukupi untuk kuantitas produksi yang diminta THEN sistem SHALL menolak penyimpanan batch dengan status `409`, menampilkan nama bahan yang kurang beserta stok tersedia, dan SHALL NOT mengubah stok bahan maupun produk.

### US-6: POS, validasi stok, dan pembayaran

Sebagai kasir, saya ingin mencari produk, mengatur keranjang, dan menyelesaikan pembayaran secara cepat, agar transaksi pelanggan dapat diproses dalam waktu singkat dan akurat.

1. **AC-6.1** WHEN kasir memasukkan kata kunci pencarian minimal 1 karakter pada POS THEN sistem SHALL menampilkan produk aktif yang namanya mengandung kata kunci tersebut dalam waktu maksimal 200 ms untuk katalog hingga 100 produk.
2. **AC-6.2** WHEN kasir menekan produk pada hasil pencarian atau grid produk THEN sistem SHALL menambahkan produk ke keranjang atau menambah kuantitasnya satu unit apabila produk tersebut sudah ada di keranjang.
3. **AC-6.3** WHEN kasir mengubah kuantitas item melalui tombol tambah atau kurang THEN sistem SHALL memperbarui subtotal keranjang secara langsung; kuantitas yang mencapai 0 SHALL menghapus item dari keranjang.
4. **AC-6.4** IF kuantitas produk dalam keranjang melebihi stok tersedia dan kasir bukan owner THEN sistem SHALL memblokir pembayaran, menampilkan pesan “Stok [nama produk] tidak mencukupi. Tersedia: [jumlah].”, dan SHALL NOT membuat transaksi.
5. **AC-6.5** WHEN owner mengonfirmasi override stok kurang dengan alasan wajib minimal 5 karakter THEN sistem SHALL mengizinkan transaksi diproses, mencatat alasan override dan identitas owner, serta memperbolehkan stok produk menjadi negatif.
6. **AC-6.6** WHEN kasir memilih metode `TUNAI` dan memasukkan nominal diterima yang lebih besar atau sama dengan total tagihan THEN sistem SHALL menghitung kembalian sebagai `paid_amount - total`, menampilkan nominal kembalian sebelum konfirmasi, dan menyimpan nilai tersebut pada transaksi.
7. **AC-6.7** IF nominal tunai yang diterima lebih kecil dari total tagihan THEN sistem SHALL menonaktifkan tombol konfirmasi pembayaran dan menampilkan kekurangan pembayaran secara real-time.
8. **AC-6.8** WHEN pembayaran dengan metode `QRIS` atau `TRANSFER` dikonfirmasi THEN sistem SHALL menyimpan transaksi dengan `paid_amount` sama dengan total tagihan dan `change_amount` bernilai 0.

### US-7: Penjualan hutang, piutang pelanggan, dan riwayat transaksi

Sebagai owner, saya ingin mencatat penjualan hutang dan menerima pembayaran piutang, agar uang yang belum diterima dari pelanggan tidak terlupakan.

1. **AC-7.1** WHEN kasir memilih metode pembayaran `HUTANG` pada POS THEN sistem SHALL mewajibkan pemilihan pelanggan aktif dan tanggal jatuh tempo sebelum transaksi dapat dikonfirmasi.
2. **AC-7.2** IF pelanggan tidak dipilih, tanggal jatuh tempo kosong, atau total penjualan melebihi limit piutang pelanggan yang bernilai lebih dari 0 THEN sistem SHALL menolak konfirmasi penjualan hutang dengan status `422` dan SHALL NOT mengurangi stok.
3. **AC-7.3** WHEN penjualan hutang berhasil dikonfirmasi THEN sistem SHALL mengurangi stok produk terjual, membuat transaksi berstatus pembayaran `BELUM_LUNAS`, dan membuat piutang dengan `amount` serta sisa tagihan sebesar total transaksi.
4. **AC-7.4** WHEN owner mencatat pembayaran piutang dengan nominal lebih dari 0 dan tidak melebihi sisa tagihan THEN sistem SHALL menambah total pembayaran piutang, menyimpan riwayat pembayaran beserta tanggal dan metode pembayaran, serta memperbarui status menjadi `SEBAGIAN` atau `LUNAS`.
5. **AC-7.5** IF nominal pembayaran piutang lebih besar dari sisa tagihan atau bernilai 0 THEN sistem SHALL menolak pembayaran dengan status `422` dan SHALL NOT mengubah saldo piutang.
6. **AC-7.6** WHEN kasir membuka riwayat transaksi THEN sistem SHALL hanya menampilkan transaksi yang dibuat oleh kasir tersebut pada tanggal berjalan, sedangkan owner SHALL dapat memfilter seluruh transaksi bisnis berdasarkan rentang tanggal, status pembayaran, dan metode pembayaran.

### US-8: Pencetakan struk thermal dan fallback struk digital

Sebagai kasir, saya ingin mencetak atau membagikan struk setelah transaksi selesai, agar pelanggan menerima bukti pembayaran secara langsung.

1. **AC-8.1** WHEN transaksi pembayaran berhasil disimpan THEN sistem SHALL menampilkan halaman konfirmasi transaksi dengan tombol `Cetak Struk`, `Bagikan Struk`, dan `Transaksi Baru`.
2. **AC-8.2** WHEN printer Bluetooth yang kompatibel telah dipilih dan kasir menekan `Cetak Struk` THEN sistem SHALL mengirim perintah ESC/POS sesuai lebar kertas yang dikonfigurasi, yaitu 58 mm atau 80 mm.
3. **AC-8.3** WHEN proses cetak berhasil THEN sistem SHALL mencatat event `pos_print_success` dan memulai pengiriman data cetak dalam waktu maksimal 2 detik setelah kasir menekan tombol cetak.
4. **AC-8.4** IF koneksi Bluetooth gagal, printer tidak tersedia, atau pengiriman ESC/POS gagal THEN sistem SHALL mempertahankan transaksi yang telah berhasil disimpan, mencatat event `pos_print_failed`, dan menampilkan pesan “Struk belum tercetak. Periksa printer lalu coba lagi atau bagikan struk digital.”
5. **AC-8.5** WHEN sistem menghasilkan struk cetak atau digital THEN sistem SHALL memuat minimal nama usaha, nomor transaksi, tanggal dan waktu, nama kasir, daftar item, kuantitas, harga, total, metode pembayaran, nominal diterima, kembalian bila ada, dan footer usaha bila dikonfigurasi.

### US-9: Pengeluaran, dashboard owner, dan laporan laba rugi

Sebagai owner, saya ingin mencatat pengeluaran dan melihat ringkasan keuangan usaha, agar saya mengetahui omzet, COGS, laba kotor, dan laba bersih secara periodik.

1. **AC-9.1** WHEN owner menyimpan pengeluaran dengan kategori, nominal lebih dari 0, dan tanggal transaksi THEN sistem SHALL mencatat transaksi bertipe `EXPENSE`; catatan dan lampiran bukti pengeluaran SHALL bersifat opsional.
2. **AC-9.2** IF kategori pengeluaran tidak dipilih, nominal bernilai 0 atau negatif, atau tanggal tidak valid THEN sistem SHALL menolak penyimpanan dengan status `422` dan SHALL NOT membuat transaksi pengeluaran.
3. **AC-9.3** WHEN owner membuka dashboard pada hari berjalan THEN sistem SHALL menampilkan omzet hari ini, COGS penjualan hari ini, laba kotor hari ini, total pengeluaran hari ini, net profit hari ini, jumlah stok kritis, dan total piutang jatuh tempo.
4. **AC-9.4** WHEN owner memilih rentang tanggal pada laporan keuangan THEN sistem SHALL menghitung omzet dari transaksi penjualan yang berhasil, COGS dari item penjualan, laba kotor sebagai `omzet - COGS`, net profit sebagai `laba kotor - pengeluaran`, dan menampilkan nilai dalam mata uang Rupiah.
5. **AC-9.5** WHEN owner mengekspor laporan untuk rentang tanggal yang valid THEN sistem SHALL mengunduh file CSV berisi minimal tanggal, omzet, COGS, laba kotor, pengeluaran, dan net profit; nama file SHALL menggunakan format `laporan-dapurkasir-YYYY-MM-DD-YYYY-MM-DD.csv`.

### US-10: Pengaturan usaha, isolasi data, dan pengalaman aplikasi web

Sebagai owner, saya ingin mengatur identitas usaha dan menggunakan aplikasi dengan aman pada perangkat mobile/tablet, agar operasional harian konsisten dan data bisnis tidak tercampur.

1. **AC-10.1** WHEN owner memperbarui nama usaha, alamat, nomor telepon, footer struk, logo, atau lebar kertas printer THEN sistem SHALL menyimpan perubahan hanya untuk bisnis owner tersebut dan menggunakan data terbaru pada struk berikutnya.
2. **AC-10.2** IF owner mengunggah logo usaha dengan format selain PNG, JPG, atau WEBP, atau ukuran file lebih dari 2 MB THEN sistem SHALL menolak unggahan dengan status `422` dan menampilkan pesan validasi format atau ukuran file.
3. **AC-10.3** WHEN pengguna terautentikasi mengakses atau memodifikasi data bisnis melalui antarmuka maupun API THEN sistem SHALL hanya mengizinkan data dengan `business_id` yang sama dengan bisnis pada sesi pengguna.
4. **AC-10.4** IF pengguna mencoba mengakses data dari `business_id` lain melalui perubahan URL, payload, atau API request THEN sistem SHALL menolak permintaan dengan status `403`, tidak mengembalikan data bisnis lain, dan mencatat kejadian keamanan.
5. **AC-10.5** WHEN halaman POS dibuka pada viewport mobile atau tablet THEN sistem SHALL menampilkan kontrol tambah/kurang kuantitas dan tombol pembayaran dengan area sentuh minimal 44 × 44 px.

## Out of Scope

- Dukungan transaksi POS penuh saat offline, termasuk antrean transaksi lokal dan sinkronisasi konflik otomatis.
- Produksi multi-step, resep bertingkat, sub-produk, atau semi-finished goods.
- Pengelolaan multi-outlet dan laporan konsolidasi antar cabang.
- Integrasi QRIS dinamis atau payment gateway untuk verifikasi pembayaran otomatis.
- Dukungan barcode scanner USB/Bluetooth HID.
- Pengiriman pengingat piutang otomatis melalui WhatsApp, SMS, atau email.
- Export laporan dalam format PDF.
- Integrasi software akuntansi pihak ketiga.
- Audit log lengkap untuk seluruh perubahan master data, stok, harga, dan pengaturan.
- Pembayaran berlangganan PRO secara otomatis melalui payment gateway; rilis awal hanya memerlukan status paket yang dapat dikelola melalui proses operasional internal.

## Open Questions

1. Apakah kasir diperbolehkan menerima pembayaran piutang, atau fitur pembayaran piutang hanya dapat dilakukan oleh owner?
2. Berapa ambang stok kritis default yang digunakan pada dashboard, dan apakah owner dapat mengatur ambang berbeda untuk setiap item?
3. Apakah produk tanpa pelacakan stok (`track_stock = false`) tetap dapat dijual tanpa validasi stok dan tanpa mengurangi kuantitas stok?
4. Apakah harga dasar bahan pada produksi selalu menggunakan `last_buy_price`, atau perlu mendukung metode biaya rata-rata tertimbang pada iterasi berikutnya?
5. Bagaimana proses aktivasi paket PRO pada rilis awal: diubah manual oleh admin internal, melalui invoice, atau melalui halaman permintaan upgrade?
6. Apakah transaksi yang sudah selesai dapat dibatalkan atau direfund, dan bagaimana dampaknya terhadap stok, piutang, serta laporan laba rugi?