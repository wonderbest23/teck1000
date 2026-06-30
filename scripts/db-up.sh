#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-teck1000-pg}"
DB_PORT="${DB_PORT:-54322}"

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "→ Postgres 컨테이너 이미 실행 중: $CONTAINER_NAME"
else
  echo "→ Postgres 17 컨테이너 시작 ($CONTAINER_NAME, port $DB_PORT)"
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=postgres \
    -p "${DB_PORT}:5432" \
    postgres:17
  sleep 4
fi

"$(dirname "$0")/db-migrate.sh"
