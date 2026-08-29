import * as XLSX from "xlsx";
import type { BusinessProfile, ImportKind, PlanState } from "@/lib/types";

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("Rp", "Rp ");

export const shortRupiah = (value: number) =>
  value >= 1000000
    ? `Rp ${(value / 1000000).toFixed(1).replace(".", ",")} jt`
    : value >= 1000
    ? `Rp ${(value / 1000).toFixed(0)} rb`
    : rupiah(value);

export const dateLabel = (value: string) => {
  if (!value) return "-";
  try {
    const cleanDate = value.includes("T") ? value.split("T")[0] : value;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${cleanDate}T00:00:00`));
  } catch {
    return value;
  }
};

export const initials = (value: string) =>
  (value || "")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "DK";

export const defaultPlan: PlanState = {
  name: "FREE",
  salesLimit: 50,
  productLimit: 30,
  materialLimit: 50,
};

export const defaultBusinessProfile: BusinessProfile = {
  name: "DapurKasir",
  phone: "",
  address: "",
  receipt_footer: "Terima kasih sudah mendukung usaha lokal.",
  paper_width: 58,
};

export function downloadItemTemplate(kind: ImportKind) {
  const rows =
    kind === "PRODUCT"
      ? [
          {
            nama: "Sambal Bawang 150g",
            kategori: "Sambal",
            satuan: "jar",
            stok_awal: 0,
            harga_jual: 28000,
          },
        ]
      : [
          {
            nama: "Cabai rawit merah",
            kategori: "Bahan Utama",
            satuan: "kg",
            stok_awal: 0,
            harga_beli_terakhir: 68000,
          },
        ];
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(16, key.length + 4),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    kind === "PRODUCT" ? "Produk Jadi" : "Bahan Baku"
  );
  XLSX.writeFile(
    workbook,
    kind === "PRODUCT" ? "template-import-produk.xlsx" : "template-import-bahan-baku.xlsx"
  );
}
