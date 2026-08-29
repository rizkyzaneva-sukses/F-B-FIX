#!/bin/sh
# Apply every migration in order.
#
# For deployments that do NOT use docker-compose.yml (e.g. separate EasyPanel services),
# where the one-shot `migrate` service never runs. Open a terminal on the web container
# and run:
#
#   sh db/migrate.sh
#
# Needs DATABASE_URL, e.g.
#   postgres://user:pass%40word@creative_fnb-db:5432/fnb?sslmode=disable
# A literal @ in the password must be written as %40, otherwise the URL is unparseable.
#
# Every migration is written to be re-runnable, so running this repeatedly is safe.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL belum diisi." >&2
  echo "Contoh: DATABASE_URL='postgres://user:pass%40word@host:5432/db?sslmode=disable' sh db/migrate.sh" >&2
  exit 1
fi

DIR="$(dirname "$0")/migrations"

if [ ! -d "$DIR" ]; then
  echo "Folder migrasi tidak ditemukan: $DIR" >&2
  exit 1
fi

for file in "$DIR"/*.sql; do
  echo "==> menerapkan $(basename "$file")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --echo-errors -f "$file"
done

echo "==> semua migrasi selesai"
