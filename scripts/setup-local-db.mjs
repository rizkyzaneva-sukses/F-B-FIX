#!/usr/bin/env node
/**
 * Buat role + database lokal, lalu jalankan migrasi.
 *
 * Default (bisa ditimpa env):
 *   PGHOST=localhost  PGUSER=postgres  PGDATABASE=dapurkasir
 *   APP_DB_USER=dapurkasir  APP_DB_PASSWORD=dapurkasir_local
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

loadEnv();
delete process.env.DATABASE_URL;
const adminUser = process.env.PGADMIN_USER || "postgres";
const savedAppUser = process.env.PGUSER;
delete process.env.PGUSER;
delete process.env.PGPASSWORD;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findPsql() {
  if (process.env.PSQL_PATH && fs.existsSync(process.env.PSQL_PATH)) return process.env.PSQL_PATH;
  const candidates = [
    "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe",
    "/usr/bin/psql",
  ];
  return candidates.find((entry) => fs.existsSync(entry)) || "psql";
}

function psql(args, { database = "postgres", user = process.env.PGADMIN_USER || "postgres" } = {}) {
  const result = spawnSync(
    findPsql(),
    ["-v", "ON_ERROR_STOP=1", "-U", user, "-d", database, ...args],
    { encoding: "utf8", env: process.env }
  );
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || "").trim();
    throw new Error(detail || `psql exited ${result.status}`);
  }
  return result.stdout;
}

const appUser = process.env.APP_DB_USER || savedAppUser || "dapurkasir";
const appPassword = process.env.APP_DB_PASSWORD || "dapurkasir_local";
const appDb = process.env.PGDATABASE || "dapurkasir";

console.log(`==> cek role ${appUser} dan database ${appDb}`);

psql([
  "-c",
  `
do $$
begin
  if not exists (select 1 from pg_roles where rolname = '${appUser}') then
    create role ${appUser} login superuser password '${appPassword.replace(/'/g, "''")}';
  else
    alter role ${appUser} with login superuser password '${appPassword.replace(/'/g, "''")}';
  end if;
end $$;
`,
]);

const exists = psql(["-tAc", `select 1 from pg_database where datname = '${appDb}'`]).trim();
if (exists !== "1") {
  psql(["-c", `create database ${appDb} owner ${appUser}`]);
  console.log(`==> database ${appDb} dibuat`);
} else {
  console.log(`==> database ${appDb} sudah ada`);
}

process.env.PGUSER = appUser;
process.env.PGPASSWORD = appPassword;
process.env.PGDATABASE = appDb;
process.env.PGHOST = process.env.PGHOST || "localhost";
process.env.DATABASE_URL = `postgres://${appUser}:${appPassword}@${process.env.PGHOST}:5432/${appDb}`;

const migrate = spawnSync(process.execPath, [path.join(root, "scripts", "migrate.mjs")], {
  stdio: "inherit",
  env: process.env,
});
process.exit(migrate.status ?? 1);
