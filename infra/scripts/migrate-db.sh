#!/usr/bin/env bash
set -euo pipefail
: "${SOURCE_URL:?Set SOURCE_URL to the Supabase connection string}"
: "${TARGET_URL:?Set TARGET_URL to the Azure PG connection string}"
DUMP_FILE="${DUMP_FILE:-./origin-supabase-$(date +%Y%m%d-%H%M%S).sql}"
SCHEMAS=(public)
run() { if [[ "${DRY_RUN:-0}" == "1" ]]; then printf '[dry-run] %s\n' "$*"; else "$@"; fi; }
echo "==> 1/4  pg_dump -> $DUMP_FILE"
run pg_dump "$SOURCE_URL" --no-owner --no-acl --clean --if-exists --schema=public --format=plain --file="$DUMP_FILE"
echo "==> 2/4  Reset target public schema"
run psql "$TARGET_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL
echo "==> 3/4  Restore dump into target"
run psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"
echo "==> 4/4  Row-count comparison"
COUNT_SQL="SELECT schemaname, relname AS table_name, n_live_tup AS rows FROM pg_stat_user_tables WHERE schemaname IN ('${SCHEMAS[*]}') ORDER BY n_live_tup DESC, relname;"
echo; echo "--- SOURCE (Supabase) ---"; run psql "$SOURCE_URL" -c "$COUNT_SQL"
echo; echo "--- TARGET (Azure UAE) ---"; run psql "$TARGET_URL" -c "$COUNT_SQL"
echo; echo "Dump retained at: $DUMP_FILE"; echo "Done."
