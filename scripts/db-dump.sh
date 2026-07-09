#!/usr/bin/env bash
# scripts/db-dump.sh — full custom-format dump of the project's Postgres.
# Output: backups/postgres/amorosi-YYYYMMDD-HHMMSS.dump (+ .sha256)
# WSL: run with DOCKER=docker.exe. Never prints credentials.
set -euo pipefail

DOCKER="${DOCKER:-docker}"
PG_SERVICE="${PG_SERVICE:-postgres}"
DB_USER="${DB_USER:-amorosi}"
DB_NAME="${DB_NAME:-amorosi}"
OUT_DIR="${OUT_DIR:-backups/postgres}"

PG=$($DOCKER compose ps -q "$PG_SERVICE")
[ -n "$PG" ] || { echo "ERROR: postgres service '$PG_SERVICE' not running" >&2; exit 1; }

mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$OUT_DIR/amorosi-$STAMP.dump"

echo "[db-dump] pg_dump -Fc $DB_NAME -> $FILE"
$DOCKER exec "$PG" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$FILE"

SIZE=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")
[ "$SIZE" -gt 1024 ] || { echo "ERROR: dump suspiciously small ($SIZE bytes)" >&2; exit 1; }

sha256sum "$FILE" > "$FILE.sha256"
echo "[db-dump] OK — $SIZE bytes"
echo "[db-dump] checksum: $(cut -d' ' -f1 "$FILE.sha256")"
echo "[db-dump] restore with: scripts/db-restore.sh $FILE"
