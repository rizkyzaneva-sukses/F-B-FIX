import { postgrestJson, postgrestCount } from "@/lib/postgrest";

export interface PlanLimits {
  plan: "FREE" | "PRO";
  sales_transaction_limit: number;
  product_limit: number;
  raw_material_limit: number;
}

export interface UsageCounts {
  salesThisMonth: number;
  activeProducts: number;
  activeMaterials: number;
}

/**
 * Fetch plan limits and current usage for a business.
 */
export async function getPlanInfo(
  businessId: string,
  token?: string
): Promise<{ limits: PlanLimits; usage: UsageCounts }> {
  const [businesses, activeProducts, activeMaterials, salesThisMonth] = await Promise.all([
    postgrestJson<Array<PlanLimits>>(
      `/businesses?select=plan,sales_transaction_limit,product_limit,raw_material_limit&id=eq.${businessId}`,
      {},
      token
    ),
    postgrestCount(`/items?business_id=eq.${businessId}&item_type=eq.PRODUCT&is_active=eq.true`, token),
    postgrestCount(`/items?business_id=eq.${businessId}&item_type=eq.RAW_MATERIAL&is_active=eq.true`, token),
    postgrestCount(
      `/transactions?business_id=eq.${businessId}&transaction_type=eq.SALE&occurred_at=gte.${new Date().toISOString().slice(0, 7)}-01`,
      token
    ),
  ]);

  const business = businesses[0];
  if (!business) throw new Error("Bisnis tidak ditemukan");

  return {
    limits: business,
    usage: { salesThisMonth, activeProducts, activeMaterials },
  };
}

/**
 * Check if a new product can be added within plan limits.
 */
export async function assertCanAddProduct(businessId: string, token?: string): Promise<void> {
  const { limits, usage } = await getPlanInfo(businessId, token);
  if (limits.plan === "PRO") return;
  if (usage.activeProducts >= limits.product_limit) {
    throw Object.assign(
      new Error(`Batas ${limits.product_limit} produk paket Gratis telah tercapai. Upgrade ke PRO untuk menambah produk.`),
      { status: 409 }
    );
  }
}

/**
 * Check if a new raw material can be added within plan limits.
 */
export async function assertCanAddMaterial(businessId: string, token?: string): Promise<void> {
  const { limits, usage } = await getPlanInfo(businessId, token);
  if (limits.plan === "PRO") return;
  if (usage.activeMaterials >= limits.raw_material_limit) {
    throw Object.assign(
      new Error(`Batas ${limits.raw_material_limit} bahan baku paket Gratis telah tercapai. Upgrade ke PRO untuk menambah bahan.`),
      { status: 409 }
    );
  }
}

/**
 * Check if a new POS sale can be made within plan limits.
 */
export async function assertCanMakeSale(businessId: string, token?: string): Promise<void> {
  const { limits, usage } = await getPlanInfo(businessId, token);
  if (limits.plan === "PRO") return;
  if (usage.salesThisMonth >= limits.sales_transaction_limit) {
    throw Object.assign(
      new Error(`Batas ${limits.sales_transaction_limit} transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.`),
      { status: 409 }
    );
  }
}
