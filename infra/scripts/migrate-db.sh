#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# migrate-db.sh — Supabase → Azure PostgreSQL data migration
#
# Implements ADR-0001 Phase 3 (Data Migration).
# Run this during a quiet window (Friday evening UAE time recommended).
#
# Prerequisites:
#   - pg_dump and pg_restore installed locally (PostgreSQL 16 client)
#   - Access to Supabase database (connection string)
#   - Access to Azure PostgreSQL (connection string)
#   - Azure PostgreSQL firewall allows your IP (or use Azure Cloud Shell)
#
# Usage:
#   export SUPABASE_URL='postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
#   export AZURE_PG_URL='postgresql://origin_admin:[password]@pg-origin-prod-uaenorth.postgres.database.azure.com:5432/origin?sslmode=require'
#   bash infra/scripts/migrate-db.sh
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/origin_supabase_dump_${TIMESTAMP}.sql"

# ── Validate environment ─────────────────────────────────────────────
if [ -z "${SUPABASE_URL:-}" ]; then
  echo "ERROR: SUPABASE_URL is not set." >&2
  echo "  export SUPABASE_URL='postgresql://...'" >&2
  exit 1
fi

if [ -z "${AZURE_PG_URL:-}" ]; then
  echo "ERROR: AZURE_PG_URL is not set." >&2
  echo "  export AZURE_PG_URL='postgresql://origin_admin:PASSWORD@pg-origin-prod-uaenorth.postgres.database.azure.com:5432/origin?sslmode=require'" >&2
  exit 1
fi

echo "════════════════════════════════════════════════════════════════"
echo "  Origin Database Migration: Supabase → Azure PostgreSQL"
echo "  Timestamp: ${TIMESTAMP}"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Dump from Supabase ───────────────────────────────────────
echo "[1/5] Dumping from Supabase..."
echo "      Dump file: ${DUMP_FILE}"

# --no-owner: Azure PG has a different superuser; skip ownership commands.
# --no-privileges: Don't carry over Supabase-specific grants.
# --clean: Include DROP statements so the restore is idempotent.
# --if-exists: Don't error on DROP if the object doesn't exist yet.
# --schema=public: Only the public schema (skip Supabase internal schemas
#   like auth, storage, realtime, etc.).
pg_dump "${SUPABASE_URL}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --schema=public \
  > "${DUMP_FILE}"

DUMP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
echo "      Dump complete: ${DUMP_SIZE}"
echo ""

# ── Step 2: Count source rows ────────────────────────────────────────
echo "[2/5] Counting source rows (Supabase)..."
SOURCE_COUNTS=$(psql "${SUPABASE_URL}" -t -A -c "
  SELECT tablename, n_live_tup
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
")
echo "${SOURCE_COUNTS}"
echo ""

# ── Step 3: Restore to Azure PostgreSQL ──────────────────────────────
echo "[3/5] Restoring to Azure PostgreSQL..."
echo "      Target: pg-origin-prod-uaenorth.postgres.database.azure.com/origin"
echo ""
echo "      ⚠️  This will DROP and recreate public schema tables."
read -p "      Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

psql "${AZURE_PG_URL}" < "${DUMP_FILE}"
echo "      Restore complete."
echo ""

# ── Step 4: Count target rows ────────────────────────────────────────
echo "[4/5] Counting target rows (Azure PG)..."
TARGET_COUNTS=$(psql "${AZURE_PG_URL}" -t -A -c "
  SELECT tablename, n_live_tup
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
")
echo "${TARGET_COUNTS}"
echo ""

# ── Step 5: Validate ─────────────────────────────────────────────────
echo "[5/5] Validation summary"
echo "────────────────────────"
echo ""
echo "SOURCE (Supabase):"
echo "${SOURCE_COUNTS}" | while IFS='|' read -r table count; do
  printf "  %-30s %s rows\n" "${table}" "${count}"
done
echo ""
echo "TARGET (Azure PG):"
echo "${TARGET_COUNTS}" | while IFS='|' read -r table count; do
  printf "  %-30s %s rows\n" "${table}" "${count}"
done
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  MANUAL CHECKS:"
echo "  1. Compare row counts above — they should match exactly."
echo "  2. Spot-check a few business records:"
echo "     psql \"${AZURE_PG_URL}\" -c 'SELECT id, email FROM \"Customer\" LIMIT 5;'"
echo "  3. Run Prisma migration status:"
echo "     cd apps/backend && DATABASE_URL=\"${AZURE_PG_URL}\" uv run prisma migrate status"
echo "  4. Update Container App DATABASE_URL to Azure PG:"
echo "     az containerapp secret set --name ca-origin-backend-prod --resource-group rg-origin-prod-uaenorth --secrets database-url=\"<azure-pg-url>\" direct-url=\"<azure-pg-url>\""
echo "  5. Restart the Container App revision to pick up the new secret."
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Dump file preserved at: ${DUMP_FILE}"
echo "Delete it after confirming migration success."
