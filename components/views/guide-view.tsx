import {
  BarChart3,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Leaf,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { Accordion, Step, Tip } from "@/components/ui/accordion";
import { rupiah } from "@/lib/format";
import type { UserRole } from "@/lib/types";

export function GuideView({ role }: { role: UserRole }) {
  const [tab, setTab] = useState<"panduan" | "studi" | "laporan">("panduan");
  const [openSection, setOpenSection] = useState<string | null>("dashboard");

  const toggle = (id: string) => setOpenSection((current) => (current === id ? null : id));

  return (
    <main className="page">
      <PageHeading
        eyebrow="Pusat Bantuan & Tutorial"
        title="Panduan Lengkap DapurKasir"
        description="Pelajari cara kerja setiap fitur, studi kasus bisnis kuliner, dan panduan membaca laporan keuangan."
      />

      <div className="category-row" style={{ marginBottom: 18 }}>
        <button
          className={`category-chip ${tab === "panduan" ? "active" : ""}`}
          onClick={() => setTab("panduan")}
        >
          Panduan Fitur & Alur
        </button>
        <button
          className={`category-chip ${tab === "studi" ? "active" : ""}`}
          onClick={() => setTab("studi")}
        >
          7 Studi Kasus Bisnis Kuliner
        </button>
        <button
          className={`category-chip ${tab === "laporan" ? "active" : ""}`}
          onClick={() => setTab("laporan")}
        >
          Cara Membaca Laporan Keuangan
        </button>
      </div>

      {tab === "panduan" ? (
        <PanduanTab role={role} openSection={openSection} toggle={toggle} />
      ) : tab === "studi" ? (
        <StudiKasusTab openSection={openSection} toggle={toggle} />
      ) : (
        <LaporanTab openSection={openSection} toggle={toggle} />
      )}
    </main>
  );
}

function PanduanTab({
  role,
  openSection,
  toggle,
}: {
  role: UserRole;
  openSection: string | null;
  toggle: (id: string) => void;
}) {
  const isKasir = role === "KASIR";

  if (isKasir) {
    return (
      <div>
        <Accordion
          id="kasir-login"
          title="Login Akun Kasir dengan PIN"
          icon={<UserRound size={18} />}
          isOpen={openSection === "kasir-login"}
          toggle={toggle}
        >
          <p>Setiap kasir memiliki akun terpisah dengan PIN 6 digit yang diberikan oleh Owner.</p>
          <Step num={1} title="Buka Halaman Kasir">
            Akses halaman kasir dari tautan masuk kasir yang dibagikan oleh Owner.
          </Step>
          <Step num={2} title="Masukkan PIN">
            Ketik 6 digit PIN kasir yang sudah didaftarkan.
          </Step>
          <Step num={3} title="Mulai Shift">
            Setelah berhasil masuk, Anda akan langsung diarahkan ke layar Kasir POS.
          </Step>
          <Tip>Jaga kerahasiaan PIN Anda. Jangan bagikan ke orang lain demi keamanan transaksi.</Tip>
        </Accordion>

        <Accordion
          id="kasir-pos"
          title="Cara Melayani Transaksi di POS"
          icon={<ShoppingCart size={18} />}
          isOpen={openSection === "kasir-pos"}
          toggle={toggle}
        >
          <p>Panduan memproses pesanan pelanggan dari keranjang hingga cetak struk.</p>
          <Step num={1} title="Cari & Pilih Produk">
            Cari produk di kolom pencarian atau filter kategori, lalu klik produk untuk memasukkannya ke keranjang.
          </Step>
          <Step num={2} title="Atur Kuantitas">
            Gunakan tombol + dan - di panel keranjang untuk mengubah jumlah porsi atau unit pesanan.
          </Step>
          <Step num={3} title="Proses Pembayaran">
            Klik tombol &quot;Bayar Sekarang&quot;, pilih metode (Tunai, QRIS, Transfer, atau Hutang).
          </Step>
          <Step num={4} title="Cetak / Bagikan Struk">
            Cetak struk ke printer thermal Bluetooth atau bagikan struk digital via WhatsApp.
          </Step>
        </Accordion>

        <Accordion
          id="kasir-tips"
          title="SOP & Tips Akhir Shift Kasir"
          icon={<Sparkles size={18} />}
          isOpen={openSection === "kasir-tips"}
          toggle={toggle}
        >
          <p>Panduan penutupan kasir dan serah terima kas di akhir hari kerja.</p>
          <Step num={1} title="Hitung Uang Fisik">
            Hitung total uang kertas dan koin di laci kasir sebelum menutup aplikasi.
          </Step>
          <Step num={2} title="Laporkan Pengeluaran Kecil">
            Pastikan seluruh pengeluaran dari laci (misal bensin kurir / galon) sudah dicatat.
          </Step>
          <Step num={3} title="Serahkan ke Owner">
            Serahkan uang dan hasil hitungan ke Owner untuk dicocokkan di menu Rekonsiliasi Kas.
          </Step>
        </Accordion>
      </div>
    );
  }

  return (
    <div>
      <Accordion
        id="dashboard"
        title="1. Dashboard & KPI Bisnis"
        icon={<LayoutDashboard size={18} />}
        isOpen={openSection === "dashboard"}
        toggle={toggle}
      >
        <p>Dashboard adalah pusat kendali untuk melihat kondisi usaha dalam satu pandangan cepat.</p>
        <Step num={1} title="Kartu KPI Atas">
          Pantau omzet penjualan hari ini, estimasi laba bersih, piutang yang belum tertagih, dan jumlah bahan yang menipis.
        </Step>
        <Step num={2} title="Grafik Tren">
          Grafik batang 7 hari membantu mengevaluasi tren omzet harian.
        </Step>
        <Step num={3} title="Peringatan Stok Kritis">
          Bahan baku di bawah batas aman akan otomatis dimunculkan agar Anda segera restock.
        </Step>
      </Accordion>

      <Accordion
        id="products"
        title="2. Produk Jadi & Katalog"
        icon={<Package size={18} />}
        isOpen={openSection === "products"}
        toggle={toggle}
      >
        <p>Kelola seluruh katalog produk siap jual yang tampil di kasir POS.</p>
        <Step num={1} title="Tambah Produk">
          Masukkan nama produk, kategori, satuan standar, harga jual retail, dan stok awal.
        </Step>
        <Step num={2} title="HPP Terkoneksi Produksi">
          Nilai HPP (Harga Pokok Penjualan) akan diperbarui secara otomatis setiap kali Anda selesai menjalankan Produksi Batch.
        </Step>
        <Step num={3} title="Import Excel / CSV">
          Gunakan fitur template Excel untuk mengimpor puluhan atau ratusan produk sekaligus.
        </Step>
      </Accordion>

      <Accordion
        id="materials"
        title="3. Bahan Baku & Peringatan Stok"
        icon={<Leaf size={18} />}
        isOpen={openSection === "materials"}
        toggle={toggle}
      >
        <p>Pantau persediaan bahan baku mentah untuk racikan dan kemasan produk.</p>
        <Step num={1} title="Pencatatan Bahan">
          Daftarkan bahan baku seperti cabai, minyak, botol kaca, bumbu, beserta harga beli terakhir. Untuk banyak item sekaligus: unduh Template, isi kolom nama / satuan / stok_awal / harga_beli_terakhir, lalu Import dari halaman Bahan Baku — bukan dari Katalog Produk.
        </Step>
        <Step num={2} title="Pemotongan Otomatis">
          Stok bahan otomatis berkurang saat produksi batch dan bertambah saat pembelian dicatat.
        </Step>
      </Accordion>

      <Accordion
        id="production"
        title="4. Produksi Batch (Multi-Output & HPP Otomatis)"
        icon={<Boxes size={18} />}
        isOpen={openSection === "production"}
        toggle={toggle}
      >
        <p>Ubah bahan baku menjadi beberapa varian kemasan produk jadi dengan HPP yang akurat.</p>
        <Step num={1} title="Buat Batch">
          Klik &quot;Buat Batch Produksi&quot;, masukkan produk output yang dihasilkan (bisa lebih dari satu kemasan/varian).
        </Step>
        <Step num={2} title="Pilih Bahan & Biaya Lain">
          Masukkan bahan baku yang terpakai beserta biaya operasional tambahan (gas, stiker, tenaga kerja).
        </Step>
        <Step num={3} title="Kalkulasi Otomatis">
          Sistem secara otomatis menghitung HPP per unit = Total Biaya Bahan &plus; Biaya Lain dibagi Total Kuantitas Output.
        </Step>
      </Accordion>

      <Accordion
        id="b2b"
        title="5. Alur B2B / Grosir (SO &rarr; DO &rarr; Invoice &rarr; Aging)"
        icon={<BriefcaseBusiness size={18} />}
        isOpen={openSection === "b2b"}
        toggle={toggle}
      >
        <p>Untuk penjualan ke reseller, restoran, kafe, atau supermarket dengan pembayaran bertempo.</p>
        <Step num={1} title="Sales Order (SO)">
          Buat SO resmi dengan termin pembayaran khusus (misal NET 30 hari). Konfirmasi jika pesanan sudah fix.
        </Step>
        <Step num={2} title="Surat Jalan (DO)">
          Terbitkan surat jalan dari SO yang sudah dikonfirmasi, masukkan nama supir, lalu konfirmasi setelah barang sampai.
        </Step>
        <Step num={3} title="Invoice Tagihan">
          Terbitkan faktur tagihan resmi setelah barang diterima, jatuh tempo dihitung otomatis dari tanggal termin.
        </Step>
        <Step num={4} title="Aging Piutang">
          Pantau umur tagihan di menu Aging Piutang (0-30 hari, 31-60 hari, 61-90 hari, &gt;90 hari) untuk prioritas penagihan.
        </Step>
      </Accordion>

      <Accordion
        id="cash-recon"
        title="6. Kontrol Kas Harian (Rekonsiliasi)"
        icon={<ClipboardList size={18} />}
        isOpen={openSection === "cash-recon"}
        toggle={toggle}
      >
        <p>Mencegah kebocoran dana dengan mencocokkan uang fisik laci kasir dan sistem setiap tutup toko.</p>
        <Step num={1} title="Hitung Kas Fisik">
          Hitung uang kertas dan uang logam di laci kasir saat pergantian shift atau tutup toko.
        </Step>
        <Step num={2} title="Catat & Jelaskan Selisih">
          Masukkan hasil hitungan fisik. Jika ada selisih, tuliskan penyebabnya pada kolom catatan.
        </Step>
      </Accordion>
    </div>
  );
}

function StudiKasusTab({
  openSection,
  toggle,
}: {
  openSection: string | null;
  toggle: (id: string) => void;
}) {
  return (
    <div>
      <Accordion
        id="case-sambal"
        title="Studi Kasus 1: Usaha Sambal Kemasan (Multi-Output & B2B)"
        icon={<Package size={18} />}
        isOpen={openSection === "case-sambal"}
        toggle={toggle}
      >
        <p>
          <strong>Latar Belakang:</strong> Dapur Sari memproduksi sambal kemasan. Dari satu kali masak (batch),
          dihasilkan sambal botol 150g (40 pcs) dan jar 250g (20 pcs). Sambal dijual ke kasir dan restoran mitra.
        </p>
        <Step num={1} title="Setup Bahan">
          Daftarkan Cabai, Minyak, Bawang, Garam, Botol 150g, dan Jar 250g di menu Bahan Baku.
        </Step>
        <Step num={2} title="Produksi Batch">
          Saat memasak, gunakan fitur Multi-Output: pilih Sambal 150g (40 pcs) dan Sambal 250g (20 pcs). HPP dihitung merata.
        </Step>
        <Step num={3} title="Kirim ke Restoran">
          Gunakan modul B2B untuk membuat Sales Order &rarr; Surat Jalan &rarr; Invoice bertempo 14 hari ke restoran mitra.
        </Step>
      </Accordion>

      <Accordion
        id="case-kopi"
        title="Studi Kasus 2: Kedai Kopi & Minuman Siap Saji"
        icon={<ShoppingBag size={18} />}
        isOpen={openSection === "case-kopi"}
        toggle={toggle}
      >
        <p>
          <strong>Latar Belakang:</strong> Kopi Senja menjual kopi susu dan aneka minuman dingin langsung di kasir POS.
        </p>
        <Step num={1} title="Kasir Cepat">
          Gunakan layar POS dengan filter kategori Kopi / Non-Kopi untuk transaksi cepat.
        </Step>
        <Step num={2} title="QRIS & Tunai">
          Pilih QRIS atau Tunai, sistem otomatis menghitung kembalian dan siap mencetak struk thermal.
        </Step>
        <Step num={3} title="Tutup Shift">
          Kasir menghitung uang laci dan mencatat di menu Rekonsiliasi Kas setiap malam.
        </Step>
      </Accordion>

      <Accordion
        id="case-frozen"
        title="Studi Kasus 3: Produsen Frozen Food & Reseller"
        icon={<Truck size={18} />}
        isOpen={openSection === "case-frozen"}
        toggle={toggle}
      >
        <p>
          <strong>Latar Belakang:</strong> Usaha Cireng Salju mendistribusikan ratusan pack cireng ke reseller dengan pembayaran kredit.
        </p>
        <Step num={1} title="Beri Limit Piutang">
          Atur Limit Piutang pada reseller di menu Pelanggan (misal Rp 2.000.000).
        </Step>
        <Step num={2} title="Pantau Aging">
          Cek menu Aging Piutang secara berkala untuk menagih reseller yang sudah melewati tanggal jatuh tempo via tombol WhatsApp.
        </Step>
      </Accordion>
    </div>
  );
}

function LaporanTab({
  openSection,
  toggle,
}: {
  openSection: string | null;
  toggle: (id: string) => void;
}) {
  return (
    <div>
      <Accordion
        id="lap-pnl"
        title="1. Laporan Laba Rugi (P&L / Income Statement)"
        icon={<TrendingUp size={18} />}
        isOpen={openSection === "lap-pnl"}
        toggle={toggle}
      >
        <p>Laporan Laba Rugi mengukur kinerja profitabilitas usaha dalam kurun waktu tertentu.</p>
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface-muted)", borderRadius: 10, fontSize: 13 }}>
          <strong>Rumus Utama:</strong><br />
          Omzet Penjualan &minus; HPP / COGS = <strong>Laba Kotor (Gross Profit)</strong><br />
          Laba Kotor &minus; Beban Operasional = <strong>Laba Bersih (Net Profit)</strong>
        </div>
        <Tip>Margin Laba Kotor kuliner idealnya berada di kisaran 45% &ndash; 65%.</Tip>
      </Accordion>

      <Accordion
        id="lap-cash"
        title="2. Laporan Arus Kas (Cash Flow)"
        icon={<CircleDollarSign size={18} />}
        isOpen={openSection === "lap-cash"}
        toggle={toggle}
      >
        <p>Arus Kas menunjukkan pergerakan uang masuk dan uang keluar riil di rekening dan laci kasir.</p>
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface-muted)", borderRadius: 10, fontSize: 13 }}>
          <strong>Rumus Utama:</strong><br />
          Kas Awal &plus; Kas Masuk Operasional &plus; Modal Masuk &minus; Kas Keluar Operasional &minus; Prive = <strong>Kas Akhir</strong>
        </div>
        <Tip>Laba bersih yang positif belum tentu kasnya cukup jika banyak piutang yang belum tertagih.</Tip>
      </Accordion>

      <Accordion
        id="lap-neraca"
        title="3. Laporan Neraca (Balance Sheet)"
        icon={<BarChart3 size={18} />}
        isOpen={openSection === "lap-neraca"}
        toggle={toggle}
      >
        <p>Neraca menyajikan potret kesehatan aset, utang, dan ekuitas pada tanggal tertentu.</p>
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface-muted)", borderRadius: 10, fontSize: 13 }}>
          <strong>Prinsip Keseimbangan Akuntansi:</strong><br />
          <strong>Total Aset</strong> (Kas &plus; Piutang &plus; Persediaan) = <strong>Total Kewajiban</strong> (Utang Dagang) &plus; <strong>Total Ekuitas</strong> (Modal Disetor &minus; Prive &plus; Laba Ditahan)
        </div>
      </Accordion>
    </div>
  );
}
