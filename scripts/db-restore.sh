#!/usr/bin/env bash
# scripts/db-restore.sh — restore a pg_dump custom-format file into the
# project's Postgres. DESTRUCTIVE for overlapping objects (--clean): requires
# explicit confirmation. Never prints credentials.
#
#   DOCKER=docker.exe ./scripts/db-restore.sh backups/postgres/amorosi-XXXX.dump
#
# Preconditions: the target postgres service is up and reachable; you KNOW
# which environment you are pointing at (local vs VPS).
set -euo pipefail

DOCKER="${DOCKER:-docker}"
PG_SERVICE="${PG_SERVICE:-postgres}"
DB_USER="${DB_USER:-amorosi}"
DB_NAME="${DB_NAME:-amorosi}"
DUMP="${1:-}"

[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "usage: db-restore.sh <path/to/file.dump>" >&2; exit 1; }

if [ -f "$DUMP.sha256" ]; then
  sha256sum -c "$DUMP.sha256" >/dev/null || { echo "ERROR: checksum mismatch for $DUMP" >&2; exit 1; }
  echo "[db-restore] checksum OK"
fi

PG=$($DOCKER compose ps -q "$PG_SERVICE")
[ -n "$PG" ] || { echo "ERROR: postgres service '$PG_SERVICE' not running" >&2; exit 1; }
$DOCKER exec "$PG" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null || { echo "ERROR: DB not ready" >&2; exit 1; }

echo "About to RESTORE '$DUMP' into database '$DB_NAME' on service '$PG_SERVICE'."
echo "Existing overlapping objects will be dropped and recreated (--clean --if-exists)."
read -r -p "Type 'restore' to proceed: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "aborted."; exit 1; }

$DOCKER exec -i "$PG" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner < "$DUMP"

echo "[db-restore] done. Quick verification:"
$DOCKER exec "$PG" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT 'projects: '||count(*) FROM projects UNION ALL SELECT 'prospects: '||count(*) FROM prospects UNION ALL SELECT 'leads: '||count(*) FROM leads"
