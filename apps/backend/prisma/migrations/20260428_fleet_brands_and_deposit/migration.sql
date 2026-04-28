-- Migration: add new Brand enum values and depositAmountAed column on vehicles.
-- Reason: real launch fleet (Shanghai Car Rental LLC) brings 6 brands not
-- previously in the enum, and we want a dedicated deposit column instead of
-- stuffing the value into the free-form notes field.
--
-- Notes:
--   - PostgreSQL allows ALTER TYPE ... ADD VALUE IF NOT EXISTS for idempotency
--     (PG 9.6+). Each value is added in its own statement; Prisma's migration
--     runner does not wrap them in a single transaction.
--   - depositAmountAed is nullable so any pre-existing rows remain valid.
--     The seed_fleet.py script always sets it for new vehicles.

-- New Brand enum values
ALTER TYPE "Brand" ADD VALUE IF NOT EXISTS 'DONGFENG';
ALTER TYPE "Brand" ADD VALUE IF NOT EXISTS 'BESTUNE';
ALTER TYPE "Brand" ADD VALUE IF NOT EXISTS 'HONGQI';
ALTER TYPE "Brand" ADD VALUE IF NOT EXISTS 'FORTING';
ALTER TYPE "Brand" ADD VALUE IF NOT EXISTS 'WEY';
ALTER TYPE "Brand" ADD VALUE IF NOT EXISTS 'GREAT_WALL';

-- Deposit column
ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "depositAmountAed" DECIMAL(10, 2);
