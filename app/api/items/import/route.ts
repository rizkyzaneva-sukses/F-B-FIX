import * as XLSX from "xlsx";
import { apiData, apiError } from "@/lib/api-response";
import { getPlanInfo } from "@/lib/plan-limits";
import { postgrestJson } from "@/lib/postgrest";
import { requireOwner } from "@/lib/route-auth";

type ImportKind = "PRODUCT" | "RAW_MATERIAL";
type SheetRow = Record<string, unknown>;

const MAX_IMPORT_ROWS = 500;

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_");
const normalizeUnit = (value: unknown) => String(value || "").trim().toLowerCase();
const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  const text = String(value || "").replace(/\./g, "").replace(",", ".").trim();
  return text ? Number(text) : 0;
};

function readCell(row: SheetRow, aliases: string[]) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== "") return row[alias];
  }
  return "";
}

function normalizeRow(row: SheetRow) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("error" in auth) return auth.error;

  try {
    const form = await request.formData();
    const kind: ImportKind = form.get("type") === "RAW_MATERIAL" ? "RAW_MATERIAL" : "PRODUCT";
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("File XLSX wajib diunggah.", 422, "VALIDATION_ERROR");

    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = sheetName ? workbook.Sheets[sheetName] : null;
    if (!worksheet) return apiError("Sheet pertama tidak ditemukan.", 422, "EMPTY_WORKBOOK");

    const rawRows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, { defval: "" }).map(normalizeRow).filter((row) => String(readCell(row, ["nama", "name"]) || "").trim());
    if (!rawRows.length) return apiError("Tidak ada baris valid untuk diimport.", 422, "EMPTY_IMPORT");
    if (rawRows.length > MAX_IMPORT_ROWS) return apiError(`Maksimal ${MAX_IMPORT_ROWS} baris per import.`, 422, "TOO_MANY_ROWS");

    const { limits, usage } = await getPlanInfo(auth.session.business_id, auth.token);
    if (limits.plan !== "PRO") {
      const current = kind === "PRODUCT" ? usage.activeProducts : usage.activeMaterials;
      const limit = kind === "PRODUCT" ? limits.product_limit : limits.raw_material_limit;
      const label = kind === "PRODUCT" ? "produk" : "bahan baku";
      if (current + rawRows.length > limit) {
        return apiError(`Import ${rawRows.length} ${label} melebihi batas paket Gratis (${current}/${limit} terpakai). Upgrade ke PRO untuk import lebih banyak.`, 409, "PLAN_LIMIT_REACHED");
      }
    }

    const units = await postgrestJson<Array<{ id: string; code: string }>>("/units?select=id,code", {}, auth.token);
    const unitMap = new Map(units.map((unit) => [unit.code.toLowerCase(), unit.id]));
    const errors: string[] = [];
    const records = rawRows.map((row, index) => {
      const rowNumber = index + 2;
      const name = String(readCell(row, ["nama", "name"])).trim();
      const unitCode = normalizeUnit(readCell(row, ["satuan", "unit", "unit_code"]));
      const unitId = unitMap.get(unitCode);
      const stockQty = toNumber(readCell(row, ["stok_awal", "stok", "stock", "stock_qty"]));
      const salePrice = toNumber(readCell(row, ["harga_jual", "sale_price", "price"]));
      const lastBuyPrice = toNumber(readCell(row, ["harga_beli_terakhir", "harga_beli", "last_buy_price", "price"]));
      const category = String(readCell(row, ["kategori", "category"]) || "Lainnya").trim() || "Lainnya";

      if (!name) errors.push(`Baris ${rowNumber}: nama wajib diisi.`);
      if (!unitCode || !unitId) errors.push(`Baris ${rowNumber}: satuan "${unitCode || "-"}" tidak ditemukan. Gunakan g, kg, ml, liter, pcs, botol, atau jar.`);
      if (!Number.isFinite(stockQty) || stockQty < 0) errors.push(`Baris ${rowNumber}: stok_awal harus angka 0 atau lebih.`);
      if (kind === "PRODUCT" && (!Number.isFinite(salePrice) || salePrice < 0)) errors.push(`Baris ${rowNumber}: harga_jual harus angka 0 atau lebih.`);
      if (kind === "RAW_MATERIAL" && (!Number.isFinite(lastBuyPrice) || lastBuyPrice < 0)) errors.push(`Baris ${rowNumber}: harga_beli_terakhir harus angka 0 atau lebih.`);

      return {
        business_id: auth.session.business_id,
        unit_id: unitId,
        item_type: kind,
        name,
        category,
        stock_qty: stockQty,
        sale_price: kind === "PRODUCT" ? salePrice : 0,
        last_buy_price: kind === "RAW_MATERIAL" ? lastBuyPrice : 0,
        track_stock: true,
        is_active: true,
      };
    });

    if (errors.length) return apiError(errors.slice(0, 10).join(" "), 422, "IMPORT_VALIDATION_FAILED");

    const inserted = await postgrestJson<Array<{ id: string }>>(
      "/items?select=id",
      { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(records) },
      auth.token
    );

    return apiData({ imported: inserted.length, type: kind }, 201);
  } catch (error) {
    const err = error as { message?: string; status?: number };
    return apiError(err.message || "Import XLSX gagal diproses.", err.status || 422, "ITEM_IMPORT_FAILED");
  }
}
