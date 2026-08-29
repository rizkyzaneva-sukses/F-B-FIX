#!/usr/bin/env node
/**
 * Rilis ke semua klon: panggil webhook EasyPanel berurutan, lalu verifikasi
 * /api/health sampai version-nya sama dengan APP_VERSION (default: package.json).
 *
 *   node scripts/release-all.mjs
 *   node scripts/release-all.mjs --version 1.4.0 --timeout 180
 *
 * clients.json wajib ada (dibuat provision-client.mjs). Jangan di-commit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const expectedVersion = arg("version", process.env.APP_VERSION || pkg.version);
const timeoutSec = Number(arg("timeout", "180")) || 180;
const registryPath = path.join(root, "clients.json");

if (!fs.existsSync(registryPath)) {
  console.error("clients.json tidak ada. Jalankan scripts/provision-client.mjs dulu.");
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const clients = registry.clients || [];
if (!clients.length) {
  console.error("clients.json kosong.");
  process.exit(1);
}

console.log(`Target versi: ${expectedVersion}`);
console.log(`Klien:        ${clients.length}`);

const results = [];

for (const client of clients) {
  const label = `${client.id} (${client.domain})`;
  console.log(`\n==> ${label}`);

  if (!client.easypanelWebhook) {
    console.warn("    webhook kosong — lewati deploy, tetap cek health");
  } else {
    try {
      const response = await fetch(client.easypanelWebhook, { method: "POST" });
      console.log(`    webhook ${response.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`    webhook gagal: ${message}`);
      results.push({ id: client.id, ok: false, reason: `webhook: ${message}` });
      continue;
    }
  }

  const healthUrl = `${String(client.domain).replace(/\/+$/, "")}/api/health`;
  const deadline = Date.now() + timeoutSec * 1000;
  let seen = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { cache: "no-store" });
      const body = await response.json();
      const data = body.data || body;
      seen = data;
      if (data.version === expectedVersion && data.db === "ok") {
        console.log(`    health ok  version=${data.version}  migration=${data.last_migration}`);
        results.push({ id: client.id, ok: true, version: data.version, last_migration: data.last_migration });
        seen = "done";
        break;
      }
      console.log(
        `    menunggu version=${data.version} db=${data.db} (harap ${expectedVersion})`
      );
    } catch (error) {
      console.log(`    health belum siap: ${error instanceof Error ? error.message : error}`);
    }
    await sleep(5000);
  }

  if (seen !== "done") {
    results.push({
      id: client.id,
      ok: false,
      reason: seen
        ? `version=${seen.version} db=${seen.db}`
        : `timeout ${timeoutSec}s`,
    });
  }
}

const failed = results.filter((row) => !row.ok);
console.log("\n======== ringkasan rilis ========");
for (const row of results) {
  console.log(row.ok ? `OK    ${row.id}  ${row.version}` : `GAGAL ${row.id}  ${row.reason}`);
}

if (failed.length) {
  console.error(`\nRilis BELUM selesai: ${failed.length}/${results.length} klon tertinggal.`);
  process.exit(1);
}

console.log(`\nSemua klon di versi ${expectedVersion}.`);
