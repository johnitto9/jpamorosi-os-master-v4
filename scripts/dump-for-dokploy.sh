#!/usr/bin/env bash
# scripts/dump-for-dokploy.sh — snapshot EVERYTHING the live system knows into
# ./dokploy-migration/ so it can be restored on the Dokploy VPS.
#
#   1. Postgres dump (leads, sessions, prospects, translations, events,
#      email_logs, ai_logs, brand DNA, settings…) — pg_dump custom format.
#   2. Backend data volume (/app/data): projects.json + media/uploads that
#      are NOT yet offloaded to R2.
#
# Cloudflare R2 media needs NO migration: URLs stored in the DB/projects.json
# point at NEXT_PUBLIC_MEDIA_CDN_BASE (media.jpamorosi.dev); the same bucket +
# envs serve them from anywhere.
#
# WSL note: set DOCKER=docker.exe (Docker Desktop) — `DOCKER=docker.exe ./scripts/dump-for-dokploy.sh`
set -euo pipefail

DOCKER="${DOCKER:-docker}"
PG_SERVICE="${PG_SERVICE:-postgres}"
BACKEND_SERVICE="${BACKEND_SERVICE:-amorosi-backend}"
OUT_DIR="${OUT_DIR:-./dokploy-migration}"
STAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$OUT_DIR"

echo "[1/3] Dumping Postgres (service: $PG_SERVICE)…"
PG_CONTAINER="$($DOCKER compose ps -q "$PG_SERVICE")"
if [ -z "$PG_CONTAINER" ]; then
  echo "ERROR: postgres container not running (docker compose --profile backend up -d postgres)" >&2
  exit 1
fi
$DOCKER exec "$PG_CONTAINER" pg_dump -U amorosi -Fc amorosi > "$OUT_DIR/amorosi_${STAMP}.dump"
echo "      -> $OUT_DIR/amorosi_${STAMP}.dump"

echo "[2/3] Archiving backend data volume (/app/data: projects.json + local media)…"
BACKEND_CONTAINER="$($DOCKER compose ps -q "$BACKEND_SERVICE" || true)"
if [ -n "$BACKEND_CONTAINER" ]; then
  $DOCKER exec "$BACKEND_CONTAINER" tar czf - -C /app data > "$OUT_DIR/backend_data_${STAMP}.tar.gz"
  echo "      -> $OUT_DIR/backend_data_${STAMP}.tar.gz"
else
  echo "      backend container not running — skipping volume archive (start it or copy amorosi_backend_data manually)"
fi

echo "[3/3] Writing restore cheatsheet…"
cat > "$OUT_DIR/RESTORE.md" <<EOF
# Restore on Dokploy VPS ($STAMP)

## 1. Postgres
scp amorosi_${STAMP}.dump into the VPS, then:
    docker cp amorosi_${STAMP}.dump <pg-container>:/tmp/
    docker exec <pg-container> pg_restore -U amorosi -d amorosi --clean --if-exists /tmp/amorosi_${STAMP}.dump

## 2. Backend data volume
    docker cp backend_data_${STAMP}.tar.gz <backend-container>:/tmp/
    docker exec <backend-container> tar xzf /tmp/backend_data_${STAMP}.tar.gz -C /app

## 3. Cloudflare R2 media
Nothing to move. Set the SAME envs on Dokploy:
    NEXT_PUBLIC_MEDIA_CDN_BASE=https://media.jpamorosi.dev
    R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_ENDPOINT

## 4. Verify
    curl -fsS https://<host>/api/health
    curl -fsS https://<host>/api/status     # storage/driver + capabilities
    /admin/prospects (board populated) · home (project media loads from CDN)
EOF
echo "      -> $OUT_DIR/RESTORE.md"
echo "Done."
