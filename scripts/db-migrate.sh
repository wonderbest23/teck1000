#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-54322}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

psql_cmd() {
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
}

echo "→ DB 연결 확인 ($DB_HOST:$DB_PORT)"
psql_cmd -c "select version();" >/dev/null

for migration in "$ROOT_DIR"/supabase/migrations/*.sql; do
  echo "→ 적용: $(basename "$migration")"
  psql_cmd -v ON_ERROR_STOP=1 -f "$migration"
done

echo "✓ 마이그레이션 완료"
