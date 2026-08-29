#!/usr/bin/env node
/**
 * Jalankan semua db/migrations/*.sql berurutan (Windows & Unix).
 *
 * Env: DATABASE_URL  ATAU  PGHOST / PGUSER / PGPASSWORD / PGDATABASE
 * Opsional: PSQL_PATH = path ke psql.exe
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "db", "migrations");

function findPsql() {
  if (process.env.PSQL_PATH && fs.existsSync(process.env.PSQL_PATH)) return process.env.PSQL_PATH;
  const candidates = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe",
    "/usr/bin/psql",
    "/usr/local/bin/psql",
  ];
  return candidates.find((entry) => fs.existsSync(entry)) || "psql";
}

function runPsql(args) {
  const psql = findPsql();
  const extraEnv = { ...process.env };
  const result = spawnSync(psql, ["-v", "ON_ERROR_STOP=1", "--echo-errors", ...args], {
    env: extraEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || "").trim();
    throw new Error(detail || `psql exited ${result.status}`);
  }
  return result.stdout;
}

function connectionArgs() {
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];
  return [];
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => path.join(migrationsDir, name));

if (!files.length) {
  console.error("Tidak ada file migrasi.");
  process.exit(1);
}

const conn = connectionArgs();
console.log(`==> ${files.length} migrasi, psql: ${findPsql()}`);

runPsql([
  ...conn,
  "-c",
  "create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now());",
]);

for (const file of files) {
  const name = path.basename(file);
  console.log(`==> menerapkan ${name}`);
  runPsql([...conn, "-f", file]);
  runPsql([
    ...conn,
    "-c",
    `insert into schema_migrations (filename) values ('${name.replace(/'/g, "''")}') on conflict (filename) do nothing;`,
  ]);
}

console.log("==> semua migrasi selesai");
