import { createRequire } from "node:module";
import { isSingleTenant } from "@/lib/single-tenant";
import { postgrestJson } from "@/lib/postgrest";
import { APP_VERSION } from "@/lib/version";

const bcrypt = createRequire(import.meta.url)("bcryptjs") as typeof import("bcryptjs");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type BootstrapResult = {
  business_id: string | null;
  user_id: string | null;
  created: boolean;
};

/**
 * Dipanggil sekali saat proses Node menyala. Mengunci flag di SQL, memaksa
 * plan=PRO, dan membuat toko + owner dari env kalau database masih kosong.
 */
export async function bootstrapSingleTenant(options?: { retries?: number }): Promise<void> {
  const single = isSingleTenant();
  const retries = options?.retries ?? 8;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await postgrestJson("/rpc/set_instance_config", {
        method: "POST",
        body: JSON.stringify({
          p_single_tenant: single,
          p_app_version: APP_VERSION,
        }),
      });

      if (!single) {
        console.info("[bootstrap] SINGLE_TENANT mati — mode multi-toko tetap aktif.");
        return;
      }

      const email = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
      const password = process.env.OWNER_PASSWORD || "";
      const businessName = (process.env.BUSINESS_NAME || "").trim();
      const ownerName = (process.env.OWNER_NAME || "").trim();

      if (!email || !password || !businessName) {
        console.warn(
          "[bootstrap] SINGLE_TENANT=true tetapi OWNER_EMAIL / OWNER_PASSWORD / BUSINESS_NAME belum lengkap. " +
            "Aplikasi menyala, tapi tidak ada yang bisa login sampai env diisi dan proses di-restart."
        );
        return;
      }

      if (password.length < 8) {
        console.error("[bootstrap] OWNER_PASSWORD minimal 8 karakter. Bootstrap dibatalkan.");
        return;
      }

      const result = await postgrestJson<BootstrapResult>("/rpc/bootstrap_single_tenant", {
        method: "POST",
        body: JSON.stringify({
          p_business_name: businessName,
          p_email: email,
          p_name: ownerName,
          p_password_hash: await bcrypt.hash(password, 12),
        }),
      });

      if (result.created) {
        console.info(
          `[bootstrap] Toko "${businessName}" + owner ${email} dibuat. Login di /login — ganti password setelah masuk pertama.`
        );
      } else {
        console.info(`[bootstrap] Toko sudah ada (business_id=${result.business_id}). Lewati pembuatan ulang.`);
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        console.warn(`[bootstrap] Percobaan ${attempt}/${retries} gagal: ${message}. Coba lagi...`);
        await sleep(1500 * attempt);
        continue;
      }
      console.error(`[bootstrap] Gagal setelah ${retries} percobaan: ${message}`);
    }
  }
}
