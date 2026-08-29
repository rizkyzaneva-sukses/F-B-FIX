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
 * Check if a new staff/cashier account can be created within plan limits.
 * Free plan: max 1 KASIR, GUDANG and FINANCE are PRO only.
 * Pro plan: unlimited staff with KASIR, GUDANG, FINANCE roles.
 */
export async function assertCanAddStaff(
  businessId: string,
  roleToAdd: "KASIR" | "GUDANG" | "FINANCE",
  token?: string
): Promise<void> {
  const { limits } = await getPlanInfo(businessId, token);
  if (limits.plan === "PRO") return;

  if (roleToAdd !== "KASIR") {
    throw Object.assign(
      new Error(
        "Role Gudang dan Finance hanya tersedia untuk paket PRO. Upgrade ke PRO untuk mengaktifkan multi-role tim."
      ),
      { status: 403 }
    );
  }

  const existingStaffCount = await postgrestCount(
    `/app_users?business_id=eq.${businessId}&is_active=eq.true&role=neq.OWNER`,
    token
  );

  if (existingStaffCount >= 1) {
    throw Object.assign(
      new Error(
        "Paket Free hanya dapat memiliki maksimal 1 akun Kasir. Upgrade ke PRO untuk menambah akun staff dan kasir tanpa batas."
      ),
      { status: 409 }
    );
  }
}

