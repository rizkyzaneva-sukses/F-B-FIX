#!/usr/bin/env node
/**
 * Unduh PostgREST (sekali) lalu jalankan di :3001 untuk development lokal.
 *
 * Membaca .env / .env.local di root. Ctrl+C untuk berhenti.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolsDir = path.join(root, "tools");
const version = process.env.POSTGREST_VERSION || "v12.2.12";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": "dapurkasir-local" } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        download(response.headers.location, dest).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} dari ${url}`));
        return;
      }
      const out = fs.createWriteStream(dest);
      response.pipe(out);
      out.on("finish", () => out.close(resolve));
      out.on("error", reject);
    });
    request.on("error", reject);
  });
}

function binaryPath() {
  const exe = os.platform() === "win32" ? "postgrest.exe" : "postgrest";
  return path.join(toolsDir, exe);
}

async function ensureBinary() {
  const dest = binaryPath();
  if (fs.existsSync(dest)) return dest;

  fs.mkdirSync(toolsDir, { recursive: true });
  const asset =
    os.platform() === "win32"
      ? `postgrest-${version}-windows-x86-64.zip`
      : os.platform() === "darwin"
        ? `postgrest-${version}-macos-aarch64.tar.xz`
        : `postgrest-${version}-linux-static-x86-64.tar.xz`;
  const url = `https://github.com/PostgREST/postgrest/releases/download/${version}/${asset}`;
  const archive = path.join(toolsDir, asset);
  console.log(`Mengunduh PostgREST ${version}...`);
  await download(url, archive);

  if (asset.endsWith(".zip")) {
    const unzip = spawnSync(
      "powershell",
      ["-NoProfile", "-Command", `Expand-Archive -Force -Path '${archive}' -DestinationPath '${toolsDir}'`],
      { encoding: "utf8" }
    );
    if (unzip.status !== 0) throw new Error(unzip.stderr || "Expand-Archive gagal");
  } else {
    const tar = spawnSync("tar", ["-xJf", archive, "-C", toolsDir], { encoding: "utf8" });
    if (tar.status !== 0) throw new Error(tar.stderr || "tar gagal");
  }

  if (!fs.existsSync(dest)) {
    throw new Error(`Binary PostgREST tidak ditemukan setelah extract: ${dest}`);
  }
  try {
    fs.chmodSync(dest, 0o755);
  } catch {
    // Windows
  }
  return dest;
}

const dbUri =
  process.env.PGRST_DB_URI ||
  process.env.DATABASE_URL ||
  "postgres://dapurkasir:dapurkasir_local@localhost:5432/dapurkasir";
const jwtSecret = process.env.POSTGREST_JWT_SECRET || process.env.PGRST_JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error("POSTGREST_JWT_SECRET (min 32 karakter) wajib di .env.local");
  process.exit(1);
}

function pgBinDir() {
  const versions = ["18", "16", "15"];
  for (const version of versions) {
    const dir = `C:\\Program Files\\PostgreSQL\\${version}\\bin`;
    if (fs.existsSync(dir)) return dir;
  }
  return "";
}

const bin = await ensureBinary();
console.log(`PostgREST ${version} → http://127.0.0.1:3001`);

const pgBin = pgBinDir();
const pathEnv = pgBin ? `${pgBin}${path.delimiter}${process.env.PATH || ""}` : process.env.PATH;

const child = spawn(
  bin,
  [],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: pathEnv,
      PGRST_DB_URI: dbUri,
      PGRST_DB_SCHEMA: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: jwtSecret,
      PGRST_DB_PRE_REQUEST: "public.check_request",
      PGRST_JWT_ROLE_CLAIM_KEY: ".db_role",
      PGRST_SERVER_PORT: process.env.PGRST_SERVER_PORT || "3001",
    },
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
