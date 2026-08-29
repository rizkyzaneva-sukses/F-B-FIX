#!/bin/sh
# Apply every *.sql migration in filename order, then record it in schema_migrations.
#
# EasyPanel / docker-compose: service `migrate` menjalankan skrip ini tiap deploy.
# Manual dari container web:
#   DATABASE_URL='postgres://user:pass@host:5432/db' sh db/migrate.sh
#
# Boleh juga pakai variabel pecahan (yang dipakai docker-compose):
#   PGHOST PGUSER PGPASSWORD PGDATABASE
#
# Setiap migrasi idempotent, jadi aman diulang.
set -e

psql_apply() {
  if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --echo-errors "$@"
  else
    if [ -z "$PGHOST" ] && [ -z "$PGUSER" ]; then
      echo "DATABASE_URL atau PGHOST/PGUSER/PGDATABASE belum diisi." >&2
      echo "Contoh: DATABASE_URL='postgres://user:pass@host:5432/db' sh db/migrate.sh" >&2
      exit 1
    fi
    psql -v ON_ERROR_STOP=1 --echo-errors "$@"
  fi
}

DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)/migrations"

if [ ! -d "$DIR" ]; then
  echo "Folder migrasi tidak ditemukan: $DIR" >&2
  exit 1
fi

psql_apply -c "create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now());"

for file in "$DIR"/*.sql; do
  [ -f "$file" ] || continue
  name="$(basename "$file")"
  echo "==> menerapkan $name"
  psql_apply -f "$file"
  psql_apply -c "insert into schema_migrations (filename) values ('$name') on conflict (filename) do nothing;"
done

echo "==> semua migrasi selesai"
