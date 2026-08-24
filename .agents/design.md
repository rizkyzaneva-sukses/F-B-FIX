---
version: "alpha"
name: "DapurKasir"
description: "Design system untuk aplikasi web POS, inventori, dan produksi bagi UMKM kuliner, dengan fokus pada kecepatan transaksi dan kejelasan laba."
colors:
  # --- Keluarga aksen / brand ---
  primary: "#047857"            # Hijau emerald 700 — identitas brand, tombol utama, fokus aktif
  primary-hover: "#065f46"      # Emerald 800 — state hover pada aksi utama
  primary-foreground: "#ffffff" # Teks di atas tombol primary
  accent: "#10b981"             # Emerald 500 — aksen grafis, ikon, highlight ringan
  accent-subtle: "#d1fae5"      # Emerald 100 — latar aktif, chip, hint halus
  accent-strong: "#064e3b"      # Emerald 900 — teks aksen berkontras tinggi
  # --- Netral ---
  background: "#f8fafc"         # Slate 50 — latar halaman, area di luar kartu
  surface: "#ffffff"            # Permukaan kartu, modal, sheet
  surface-muted: "#f1f5f9"      # Slate 100 — latar tersier, hover ringan
  foreground: "#0f172a"         # Slate 900 — teks utama
  muted-foreground: "#64748b"   # Slate 500 — teks sekunder, placeholder
  border: "#e2e8f0"             # Slate 200 — garis pemisah, border kartu
  # --- Semantik ---
  success: "#16a34a"
  success-subtle: "#dcfce7"
  warning: "#d97706"
  warning-subtle: "#fef3c7"
  error: "#dc2626"
  error-subtle: "#fee2e2"
  info: "#0284c7"
  info-subtle: "#e0f2fe"
  # --- Dark mode ---
  dark-background: "#0f172a"    # Slate 900 — latar halaman gelap
  dark-surface: "#1e293b"       # Slate 800 — kartu di mode gelap
  dark-surface-muted: "#334155" # Slate 700 — hover dan area redup
  dark-foreground: "#f8fafc"    # Teks utama di mode gelap
  dark-muted-foreground: "#94a3b8"
  dark-border: "#334155"
  dark-primary: "#34d399"       # Emerald 400 — tombol utama terang di gelap
  dark-primary-hover: "#10b981"
  dark-primary-foreground: "#052e2b" # Teks gelap di atas emerald terang
  dark-accent-subtle: "#064e3b"
  dark-accent-strong: "#6ee7b7"
typography:
  h1:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: "700"
    lineHeight: "1.3"
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: "700"
    lineHeight: "1.4"
    letterSpacing: "-0.01em"
  h4:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: "600"
    lineHeight: "1.4"
  body-md:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: "400"
    lineHeight: "1.5"
  body-sm:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: "400"
    lineHeight: "1.5"
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: "500"
    lineHeight: "1.4"
  label-caps:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: "600"
    lineHeight: "1.4"
    letterSpacing: "0.08em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: "400"
    lineHeight: "1.6"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  app-shell:
    background: "{colors.background}"
    border: "{colors.border}"
    dark-background: "{colors.dark-background}"
  nav-item:
    active-background: "{colors.accent-subtle}"
    active-foreground: "{colors.accent-strong}"
    rounded: "{rounded.md}"
  card:
    background: "{colors.surface}"
    border: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    dark-background: "{colors.dark-surface}"
  kpi-card:
    background: "{colors.surface}"
    border: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    accent-foreground: "{colors.accent-strong}"
  button-primary:
    background: "{colors.primary}"
    hover-background: "{colors.primary-hover}"
    foreground: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding-y: "{spacing.sm}"
    padding-x: "{spacing.lg}"
    font: "{typography.label}"
  button-secondary:
    background: "{colors.surface}"
    border: "{colors.border}"
    foreground: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding-y: "{spacing.sm}"
    padding-x: "{spacing.lg}"
    font: "{typography.label}"
  button-ghost:
    background: "transparent"
    hover-background: "{colors.surface-muted}"
    foreground: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding-y: "{spacing.sm}"
    padding-x: "{spacing.md}"
    font: "{typography.label}"
  input:
    background: "{colors.surface}"
    border: "{colors.border}"
    rounded: "{rounded.sm}"
    padding-y: "{spacing.sm}"
    padding-x: "{spacing.md}"
    font: "{typography.body-md}"
    placeholder: "{colors.muted-foreground}"
    focus-ring: "{colors.accent}"
  select:
    background: "{colors.surface}"
    border: "{colors.border}"
    rounded: "{rounded.sm}"
    padding-y: "{spacing.sm}"
    padding-x: "{spacing.md}"
    font: "{typography.body-md}"
  badge:
    background: "{colors.accent-subtle}"
    foreground: "{colors.accent-strong}"
    rounded: "{rounded.full}"
    padding-y: "{spacing.xs}"
    padding-x: "{spacing.sm}"
    font: "{typography.label-caps}"
  table:
    background: "{colors.surface}"
    border: "{colors.border}"
    header-text: "{colors.muted-foreground}"
    row-hover: "{colors.surface-muted}"
    font: "{typography.body-sm}"
  modal:
    background: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.2xl}"
    shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  sheet:
    background: "{colors.surface}"
    border: "{colors.border}"
    rounded-left: "{rounded.lg}"
    padding: "{spacing.2xl}"
  stepper:
    active: "{colors.primary}"
    completed: "{colors.success}"
    upcoming: "{colors.border}"
    font: "{typography.label}"
  receipt:
    background: "{colors.surface}"
    font: "{typography.code}"
    border: "{colors.border}"
    rounded: "{rounded.sm}"
    padding: "{spacing.lg}"
  toast:
    background: "{colors.foreground}"
    foreground: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"

---

## Overview

DapurKasir adalah aplikasi web POS, inventori, dan produksi yang dirancang untuk UMKM kuliner pembuat produk sendiri—mulai dari sambal, chili oil, surabi, hingga cireng isi. Produk ini membantu owner yang selama ini mencatat di buku/kertas untuk melihat laba bersih, bukan sekadar omzet. Filosofi visualnya adalah **Modern Minimal**: tenang, tegas, dan tidak banyak hiasan, karena yang paling penting adalah eksekusi transaksi yang cepat dan angka keuangan yang langsung terbaca.

Prinsip desain yang dipegang:

1. **Kecepatan kasir.** Target transaksi POS ≤ 45 detik. Karena itu, area sentuh besar, label produk jelas, dan hierarki visual mengarahkan mata langsung ke tombol *Bayar*. Desain tidak boleh membuat kasir berpikir dua kali.
2. **Kejelasan angka.** Semua metrik penting—omzet, COGS, laba kotor, stok kritis, piutang jatuh tempo—muncul sebagai kartu ringkas dengan angka yang dominan. Warna aksen dipakai untuk menarik perhatian ke hal yang butuh tindakan.
3. **Tanpa dibohongi visual.** Bayangan tipis, border halus, dan radius netral. Tidak ada kedalaman berlebihan yang membuat UI terlihat "mainan". Kepercayaan owner terhadap laporan keuangan dimulai dari tampilan yang solid dan rapi.
4. **Mobile-first, tablet-friendly.** DapurKasir dipakai di Android dan tablet oleh kasir. Setiap layar harus nyaman dipegang dengan satu tangan, dengan navigasi bawah yang mudah dijangkau, dan tetap elegan saat dibuka di laptop owner.

## Colors

### Keluarga Aksen (Brand)

Warna dasar brand adalah hijau emerald **#047857**. Hijau dipilih karena asosiasinya dengan pertumbuhan, kesegaran bahan kuliner, dan stabilitas finansial. Keluarga ini dipakai dengan disiplin:

- **`primary`** untuk tombol utama, item aktif, dan link penting—hampir selalu untuk *aksi*.
- **`primary-hover`** sedikit lebih gelap untuk umpan balik kursor.
- **`accent`** untuk elemen dekoratif, ikon, dan garis fokus.
- **`accent-subtle`** untuk latar item aktif di navigasi, chip, dan latar *highlight* angka positif.
- **`accent-strong`** untuk teks yang memakai nuansa hijau, misalnya label COGS atau persentase laba, karena kontrasnya terhadap putih jauh lebih tinggi.

Perhatian khusus pada kontras: `#047857` dengan teks putih memiliki rasio kontras sekitar **4.9:1**, memenuhi WCAG AA untuk teks normal. Saat `primary` dipakai di mode gelap, diganti `dark-primary` (`#34d399`) agar tetap terang, dan teks di atasnya memakai hijau sangat gelap `#052e2b` supaya kontras tetap terjaga.

### Netral

Semua netral memakai rona **slate** yang sedikit kebiruan, bukan abu hangat. Ini menjaga kesan bersih dan modern, sekaligus membuat hijau emerald terlihat lebih hidup. Gunakan `background` untuk latar halaman, `surface` untuk kartu dan modal, serta `surface-muted` untuk latar hover atau area yang lebih redup. Teks utama memakai slate 900, sedangkan teks sekunder memakai slate 500 yang tetap lolos AA pada ukuran normal.

### Semantik

Warna semantik hanya digunakan untuk status, bukan untuk dekorasi:

- **`success`** — transaksi berhasil, produksi selesai, piutang lunas.
- **`warning`** — stok menipis, piutang mendekati jatuh tempo.
- **`error`** — stok tidak mencukupi saat checkout, gagal print struk, atau aksi ditolak.
- **`info`** — informasi sistem, misal “offline mode aktif”.

Setiap warna semantik memiliki pasangan `*-subtle` untuk latar badge dan alert. Teks pada badge tetap memakai warna pekat (misal `#92400e` untuk warning) agar kontrasnya tinggi, bukan varian 600 secara langsung.

### Mode Gelap

Mode gelap disediakan penuh, terutama untuk kasir di sore/malam hari. Prinsipnya: jangan sekadar membalik warna, tetapi turunkan saturasi hijau agar tidak menyilaukan. Kartu memakai `dark-surface` (`#1e293b`) dan halaman `dark-background` (`#0f172a`). Tombol primary di mode gelap memakai emerald terang `#34d399` dengan foreground gelap agar tetap menonjol tanpa membuat layar terlalu biru.

## Typography

Typeface utama adalah **Plus Jakarta Sans**—geometris namun humanis, dengan x-height besar yang membuat angka dan huruf kecil terbaca jelas di layar ponsel. Pilihan ini juga mendukung nuansa Indonesia yang hangat, tidak terlalu kaku seperti grotesque standar. Font monospace digunakan khusus untuk struk, kode batch, dan angka pada preview printer karena harus terlihat seperti hasil cetak thermal.

Skala tipografi DapurKasir sengaja landai agar cepat dipindai:

| Token | Font Size | Berat | Line Height | Penggunaan |
|---|---|---|---|---|
| `h1` | 1.875rem | 700 | 1.2 | Judul halaman dashboard, laporan |
| `h2` | 1.5rem | 700 | 1.3 | Judul seksi, modal utama |
| `h3` | 1.25rem | 700 | 1.4 | Judul kartu, nama form |
| `h4` | 1.125rem | 600 | 1.4 | Sub-kartu, nama produk di keranjang |
| `body-md` | 1rem | 400 | 1.5 | Teks utama, input, isi tabel |
| `body-sm` | 0.875rem | 400 | 1.5 | Teks bantuan, metadata, tabel padat |
| `label` | 0.875rem | 500 | 1.4 | Label form, tombol, item navigasi |
| `label-caps` | 0.75rem | 600 | 1.4 | Judul kecil, kapitasi, badge, header kolom |
| `code` | 0.8125rem | 400 | 1.6 | Nomor struk, kode batch, preview ESC/POS |

Aturan pemakaian:

- Judul tidak boleh lebih kecil dari `h4`; semua judul seksi memakai `label-caps` hanya jika berperan sebagai *eyebrow* di atas judul.
- Angka finansial besar pada KPI card memakai `h1` dengan variant tabular numeric, sehingga digit sejajar saat berubah.
- Teks yang hanya suplementer—misal timestamp, status koneksi printer—memakai `body-sm` dengan `muted-foreground`.
- Jangan gunakan font family selain Plus Jakarta Sans untuk UI, kecuali `code` pada struk atau input kode.

## Layout

DapurKasir menggunakan dua jenis layout yang berbeda secara sadar:

1. **Layout Dashboard/Management** — untuk owner: master data, produksi, laporan, piutang. Memakai container maksimal **1200px** dengan grid 12 kolom dan gutter `spacing.lg` (16px).
2. **Layout POS** — untuk kasir: layar penuh tanpa container, grid produk menyesuaikan lebar. POS tidak pernah dibatasi lebar maksimum yang kecil.

Breakpoints standar:

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| `sm` | ≥ 640px | Grid produk 2 kolom, navigasi bawah tetap |
| `md` | ≥ 768px | Grid produk 3 kolom, sidebar mulai muncul |
| `lg` | ≥ 1024px | Navigasi pindah ke sidebar kiri, dashboard 12 kolom |
| `xl` | ≥ 1280px | Grid produk 4 kolom, container dashboard maksimum |

Densitas adalah **comfortable**: padding standar antar elemen `16px` (`lg`), antar kartu `16-20px`, dan tap target minimum **44×44px** untuk semua tombol di perangkat sentuh. Jarak antarbaris tabel boleh lebih rapat (`sm`), tetapi area aksi tetap besar.

Spacing token berbasis 4px: `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=20`, `2xl=24`, `3xl=32`. Gunakan token, jangan nilai mentah. Misalnya padding dalam KPI card `lg`, padding antar kartu di grid `xl`, dan padding luar halaman di tablet `2xl`.

## Elevation & Depth

Gaya visual DapurKasir adalah *flat dengan hierarki tipis*: kedalaman dibangun lewat **border** dan **warna surface**, bukan bayangan besar. Bayangan hanya dipakai untuk elemen yang benar-benar mengambang: modal, sheet, toast, dan dropdown.

Panduan bayangan:

- **Default non-floating**: tidak ada bayangan, cukup border `colors.border`.
- **Hover kartu interaktif**: `0 1px 2px rgba(15, 23, 42, 0.04)` — hampir tak terlihat, hanya memberi kesan terangkat.
- **Dropdown & popover**: `0 4px 6px -1px rgba(0, 0, 0, 0.08)`.
- **Modal & sheet**: `0 20px 25px -5px rgba(0, 0, 0, 0.1)`, dengan overlay hitam 40%.
- **Toast**: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`.

Fokus keyboard selalu ditandai dengan **ring 2px** berwarna `accent` (`#10b981`) di luar elemen. Ini penting di mode gelap juga, karena border 1px saja mudah terlewat.

## Shapes

Radius mengikuti skala medium yang netral dan aman:

| Token | Nilai | Pemakaian |
|---|---|---|
| `rounded.sm` | 6px | Input, select, field pencarian, preview struk |
| `rounded.md` | 10px | Tombol, badge di dalam kartu, item navigasi |
| `rounded.lg` | 12px | Kartu, modal, sheet, KPI card |
| `rounded.full` | 9999px | Badge status, avatar, titik indikator |

Konsistensi penting: **tombol di semua varian memakai `md`**, **field input selalu `sm`**, **wadah besar (kartu, modal) selalu `lg`**. Jangan mencampur radius dalam satu komponen yang sama hanya karena alasan estetika. Produk, bahan, dan partai pihak (pelanggan/supplier) semuanya tampil dalam kartu `lg` sehingga halaman master data terasa satu keluarga.

## Components

Semua komponen di bawah ini memakai token dari front matter. Nama komponen mengikuti bahasa yang dipakai di PRD dan antarmuka DapurKasir.

### App Shell

Kerangka aplikasi terdiri dari:

- **Desktop (`lg` ke atas)**: sidebar kiri selebar 260px dengan logo, menu utama, dan status paket (Free/PRO). Konten di kanan dengan latar `background`.
- **Mobile/tablet**: navigasi bawah (bottom nav) dengan 4 item utama: **Kasir**, **Produksi**, **Dashboard**, dan **Menu**. Tombol aksi utama—*Buat Transaksi*—mengambang di atas navigasi bawah.

Navigasi memakai `nav-item` dengan latar `accent-subtle` dan teks `accent-strong` saat aktif, serta `surface-muted` saat hover.

### Card

Kartu adalah wadah utama untuk informasi: detail produk, bahan baku, ringkasan batch, data pelanggan. Kartu memakai `surface`, border `border`, radius `lg`, dan padding `lg`. Judul kartu memakai `h3`; deskripsi singkat memakai `body-sm` dengan `muted-foreground`. Kartu tidak boleh memiliki lebih dari satu aksi utama di pojok kanan atas, kecuali dalam bentuk ikon.

### KPI Card

Varian kartu untuk dashboard owner. Angka utama memakai `h1` dengan warna `foreground`; label di atasnya memakai `label-caps`; delta atau catatan kecil memakai `body-sm`. Saat menampilkan **Laba Kotor**, angka boleh memakai `success` jika positif dan `error` jika negatif. KPI card selalu satu nilai per kartu—jangan menggabungkan tiga metrik dalam satu kartu.

### Button Primary

Tombol dengan urgensi tertinggi: **Bayar**, **Simpan Batch**, **Simpan Produk**, **Buat Produksi**. Berwarna `primary`, hover `primary-hover`, teks `primary-foreground`. Tinggi minimum 48px di layar sentuh, padding `sm` vertikal dan `lg` horizontal. Ikon diperbolehkan di kiri, tetapi label aksi tidak boleh hanya ikon.

### Button Secondary

Aksi alternatif yang tetap penting: **Export CSV**, **Cetak Ulang Struk**, **Tambah Bahan**. Berwarna `surface`, border `border`, teks `foreground`. Hover menampilkan `surface-muted`. Button secondary tidak boleh lebih menonjol dari primary dalam satu halaman yang sama.

### Button Ghost

Aksi tersier: **Edit**, **Hapus**, **Lihat Detail**, **Batal**. Transparan dengan teks `muted-foreground`, hover `surface-muted`. Untuk aksi berbahaya (hapus data), gunakan teks `error` dan konfirmasi modal.

### Input & Select

Input teks untuk nama produk, nama pelanggan/supplier, catatan pengeluaran. Memakai `surface`, border `border`, radius `sm`, padding `sm`/`md`, dan teks `body-md`. State fokus memakai ring `accent`. `Select` dipakai untuk semua pemilihan satuan, kategori, metode bayar, dan status—sesuai PRD, **tidak boleh ada input free-text untuk satuan**. Pencarian produk di POS memakai input dengan debounce dan tombol bersih (clear).

### Badge

Badge untuk status, label paket, dan tipe item. Warisan semantik:

- **Lunas**, **Selesai**, **Aktif**: `success-subtle` + `success`
- **Hutang**, **Kritis**, **Expired**: `warning-subtle` + `warning`
- **Diblokir**, **Gagal**, **Stok Habis**: `error-subtle` + `error`
- **Free**, **PRO**, **Satuan Terkunci**: `accent-subtle` + `accent-strong`

Badge memakai `rounded.full`, padding `xs`/`sm`, dan `label-caps` agar konsisten.

### Table

Dipakai di riwayat transaksi, laporan laba rugi, list piutang, dan rekap utang supplier. Header memakai `label-caps` dengan `muted-foreground`, body memakai `body-sm`, dan baris hover `surface-muted`. Kolom angka selalu rata kanan dengan tabular numeric. Untuk tabel laporan, baris total (contoh: Total Omzet) memakai `label` dengan `foreground`.

### Modal

Modal untuk konfirmasi, detail, dan form yang butuh fokus penuh. Latar `surface`, radius `lg`, padding `2xl`, shadow besar. Overlay gelap 40%. Modal tidak boleh lebih lebar dari 480px untuk form sederhana; untuk detail batch boleh 640px. Tombol aksi di modal selalu sejajar kanan, dengan **primary di paling kanan**.

### Sheet (Drawer)

Dipakai untuk keranjang POS di mobile dan tablet: masuk dari kanan, menampilkan daftar item, subtotal, dan tombol **Bayar**. Lebar maksimum 420px, radius kiri `lg`, border kiri `border`. Sheet memakai `surface` dan padding `2xl`. Saat sheet terbuka, grid produk di belakang tetap terlihat samar dengan overlay 40%.

### Stepper

Dipakai di alur **Produksi Batch**: dari Pilih Produk → Bahan Baku → Biaya Lain → Review & Simpan. Stepper memakai `label` dengan status: aktif `primary`, selesai `success`, dan mendatang `border`. Pada mobile, stepper cukup tampil sebagai indikator “Langkah 2 dari 4” di bawah judul halaman.

### Receipt (Struk)

Preview struk thermal untuk print Bluetooth. Memakai `code`, latar `surface`, border `border`, padding `lg`. Lebar preview mengikuti lebar kertas: 58mm atau 80mm. Konten struk: nama usaha, tanggal, kasir, item, subtotal, diskon, total, metode bayar, kembalian, dan footer dari pengaturan. Di layar, preview selalu disertai tombol **Cetak** dan **Unduh PDF**.

## Do's and Don'ts

### Do's

1. Gunakan warna `primary` secara hemat—hanya untuk aksi paling penting di satu layar. Di POS, itu berarti tombol **Bayar** dan tombol **Simpan**.
2. Manfaatkan KPI card untuk menjawab pertanyaan owner dalam 3 detik: *Berapa omzet hari ini? Berapa laba kotornya? Stok apa yang kritis?*
3. Selalu tampilkan satuan standar dari dropdown pada detail produk dan bahan, misal `gram`, `ml`, `pcs`, `botol`. Jangan pernah membiarkan kasir mengetik satuan bebas.
4. Beri ruang kosong yang nyaman di sekitar tombol sentuh—minimal `lg` padding—terutama di grid produk POS.
5. Gunakan badge status untuk piutang (Lunas/Sebagian/Jatuh Tempo) agar owner langsung tahu mana yang perlu ditagih.
6. Konsisten memakai radius: input `sm`, tombol `md`, kartu `lg`. Jangan membuat variasi radius baru tanpa alasan.
7. Pastikan setiap angka finansial di dashboard memiliki label satuan dan periode, misal “Laba Kotor · Hari Ini”.

### Don'ts

1. Jangan memakai hijau `accent` untuk teks kecil atau placeholder—kontrasnya tidak cukup. Untuk teks berwarna, gunakan `accent-strong`.
2. Jangan menampilkan omzet besar tanpa COGS di dashboard utama; itu menyesatkan owner yang justru butuh laba.
3. Jangan memakai bayangan tebal di kartu biasa. Kartu cukup dibedakan dengan border; bayangan hanya untuk modal/sheet/dropdown.
4. Jangan membuat alur POS multi-tahap yang tidak perlu—misal menanyakan metode bayar sebelum subtotal terlihat. Subtotal harus selalu tampak sebelum tombol Bayar.
5. Jangan gunakan status “merah” untuk hal yang bukan error, misal label paket Free. Merah hanya untuk kesalahan, blokir stok, atau gagal cetak.
6. Jangan menyembunyikan tombol **Simpan** di dalam menu ikon pada form produksi; aksi utama harus terlihat langsung.
7. Jangan membiarkan teks `muted-foreground` dipakai untuk informasi penting seperti stok menipis atau sisa piutang—itu harus naik ke `warning` atau `error`.