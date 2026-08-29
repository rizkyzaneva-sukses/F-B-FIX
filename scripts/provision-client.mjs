#!/usr/bin/env node
/**
 * Provision klien baru (Opsi D — 1 app = 1 toko).
 *
 *   node scripts/provision-client.mjs --name warung-sari --domain warung-sari.maulanacorp.my.id --email owner@warung.com
 *
 * Hasil:
 *   - secret acak (SESSION_SECRET, POSTGREST_JWT_SECRET, POSTGRES_PASSWORD)
 *   - berkas clients/<id>.env siap tempel ke EasyPanel
 *   - baris baru di clients.json (jangan di-commit)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function secret(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

const name = arg("name");
const domain = arg("domain");
const email = arg("email");
const ownerName = arg("owner-name", "Owner");
const ownerPassword = arg("password", "");
const webhook = arg("webhook", "");

if (!name || !domain || !email) {
  console.error(
    "Pemakaian: node scripts/provision-client.mjs --name <klien> --domain <host> --email <owner@email>"
  );
  console.error("Opsional: --owner-name --password --webhook");
  process.exit(1);
}

const id = slugify(name);
const password = ownerPassword || secret(12).slice(0, 16);
const sessionSecret = secret(48);
const jwtSecret = secret(48);
const postgresPassword = secret(24);
const appUrl = domain.startsWith("http") ? domain.replace(/\/+$/, "") : `https://${domain}`;

const envBody = `# DapurKasir — ${name}
# Tempel ke EasyPanel (Compose app: dapurkasir-${id}). Isi HANYA nilainya, bukan NAMA=nilai.

POSTGRES_DB=dapurkasir
POSTGRES_USER=dapurkasir
POSTGRES_PASSWORD=${postgresPassword}

POSTGREST_JWT_SECRET=${jwtSecret}
SESSION_SECRET=${sessionSecret}

APP_URL=${appUrl}
APP_PORT=3000
APP_VERSION=1.4.0

SINGLE_TENANT=true
NEXT_PUBLIC_SINGLE_TENANT=true
NEXT_PUBLIC_BACKEND_ENABLED=true

OWNER_EMAIL=${email}
OWNER_PASSWORD=${password}
OWNER_NAME=${ownerName}
BUSINESS_NAME=${name}

TRIAL_TOOLS_ENABLED=true
NEXT_PUBLIC_TRIAL_TOOLS=true
EMAIL_PROVIDER=console
EMAIL_FROM=DapurKasir <noreply@dapurkasir.com>
`;

const clientsDir = path.join(root, "clients");
fs.mkdirSync(clientsDir, { recursive: true });
const envPath = path.join(clientsDir, `${id}.env`);
fs.writeFileSync(envPath, envBody, "utf8");

const registryPath = path.join(root, "clients.json");
const registry = fs.existsSync(registryPath)
  ? JSON.parse(fs.readFileSync(registryPath, "utf8"))
  : { appVersion: "1.4.0", clients: [] };

registry.clients = registry.clients.filter((entry) => entry.id !== id);
registry.clients.push({
  id,
  name,
  domain: appUrl,
  easypanelWebhook: webhook,
  ownerEmail: email,
  createdAt: new Date().toISOString(),
});
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

console.log(`Klien:        ${name} (${id})`);
console.log(`Domain:       ${appUrl}`);
console.log(`Owner:        ${email}`);
console.log(`Password:     ${password}`);
console.log(`Env file:     ${path.relative(root, envPath)}`);
console.log(`Registry:     clients.json (${registry.clients.length} klien)`);
console.log("");
console.log("Langkah berikutnya:");
console.log(`  1. EasyPanel → Create App Compose → nama dapurkasir-${id}`);
console.log("  2. Tempel isi file env ke environment aplikasi");
console.log("  3. Arahkan domain, deploy, cek GET /api/health");
console.log("  4. Kirim email + password owner ke klien, minta ganti setelah login");
