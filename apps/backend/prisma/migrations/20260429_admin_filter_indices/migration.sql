-- Migration: add composite indices for the admin filter+sort patterns flagged
-- in audit issue #137 §4.
--
-- Every admin list page uses a `WHERE <status> = ? ORDER BY createdAt DESC`
-- shape (or for Customer, `WHERE kycStatus = ?`); the existing single-column
-- indices on customerId/vehicleId help joins but not these queries. Page 4
-- of an admin filter currently scans the whole table.
--
-- Notes:
--   - `IF NOT EXISTS` keeps the migration idempotent if applied twice.
--   - `CREATE INDEX CONCURRENTLY` would avoid table locks on a populated
--     production DB, but Prisma migrate runs each statement in a transaction
--     and CONCURRENTLY can't run inside one. Tables are still small (~tens
--     of rows in production); when they grow, switch to a dedicated DBA-run
--     migration outside Prisma.

-- Booking: status + createdAt for the admin "list all bookings, filter by
-- status, newest first" pattern.
CREATE INDEX IF NOT EXISTS "bookings_status_createdAt_idx"
  ON "bookings" ("status", "createdAt" DESC);

-- Lease: same pattern for the admin lease list.
CREATE INDEX IF NOT EXISTS "leases_status_createdAt_idx"
  ON "leases" ("status", "createdAt" DESC);

-- Vehicle: admin fleet view filters by status (AVAILABLE / LEASED /
-- MAINTENANCE / RETIRED) sorted by created.
CREATE INDEX IF NOT EXISTS "vehicles_status_createdAt_idx"
  ON "vehicles" ("status", "createdAt" DESC);

-- Customer: admin customer list filters by kycStatus.
CREATE INDEX IF NOT EXISTS "customers_kycStatus_createdAt_idx"
  ON "customers" ("kycStatus", "createdAt" DESC);

-- Payment: covers the "what's due next on this lease" query (lease detail
-- page) and the future "all overdue payments" admin view.
CREATE INDEX IF NOT EXISTS "payments_leaseId_dueDate_idx"
  ON "payments" ("leaseId", "dueDate");

CREATE INDEX IF NOT EXISTS "payments_status_dueDate_idx"
  ON "payments" ("status", "dueDate");
