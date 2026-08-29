#!/usr/bin/env node
/**
 * pg_dump database klon ini ke backups/ dengan retensi 30 hari.
 *
 *   node scripts/backup-client.mjs
 *   node scripts/backup-client.mjs --retention 30
 *
 * Env: DATABASE_URL  ATAU  PGHOST / PGUSER / PGPASSWORD / PGDATABASE
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupsDir = path.join(root, "backups");

function findBin(name) {
  const envKey = `${name.toUpperCase()}_PATH`;
  if (process.env[envKey] && fs.existsSync(process.env[envKey])) return process.env[envKey];
  const versions = ["18", "16", "15"];
  for (const version of versions) {
    const win = `C:\\Program Files\\PostgreSQL\\${version}\\bin\\${name}.exe`;
    if (fs.existsSync(win)) return win;
  }
  return name;
}

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

fs.mkdirSync(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dbName = process.env.PGDATABASE || "dapurkasir";
const file = path.join(backupsDir, `${dbName}-${stamp}.dump`);

const args = ["-Fc", "-f", file];
if (process.env.DATABASE_URL) {
  args.push(process.env.DATABASE_URL);
}

const result = spawnSync(findBin("pg_dump"), args, {
  encoding: "utf8",
  env: process.env,
});
if (result.status !== 0) {
  console.error(result.stderr || result.error?.message || "pg_dump gagal");
  process.exit(1);
}
console.log(`Backup: ${file}`);

const retentionDays = Number(arg("retention", "30")) || 30;
const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
for (const entry of fs.readdirSync(backupsDir)) {
  if (!entry.endsWith(".dump")) continue;
  const full = path.join(backupsDir, entry);
  if (fs.statSync(full).mtimeMs < cutoff) {
    fs.unlinkSync(full);
    console.log(`Hapus lama: ${entry}`);
  }
}
