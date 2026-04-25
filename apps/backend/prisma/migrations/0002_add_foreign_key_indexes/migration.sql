-- CreateIndex (IF NOT EXISTS for idempotency on production databases)
CREATE INDEX IF NOT EXISTS "vehicle_images_vehicleId_idx" ON "vehicle_images"("vehicleId");

CREATE INDEX IF NOT EXISTS "documents_customerId_idx" ON "documents"("customerId");

CREATE INDEX IF NOT EXISTS "bookings_customerId_idx" ON "bookings"("customerId");

CREATE INDEX IF NOT EXISTS "bookings_vehicleId_idx" ON "bookings"("vehicleId");

CREATE INDEX IF NOT EXISTS "leases_customerId_idx" ON "leases"("customerId");

CREATE INDEX IF NOT EXISTS "leases_vehicleId_idx" ON "leases"("vehicleId");

CREATE INDEX IF NOT EXISTS "payments_leaseId_idx" ON "payments"("leaseId");

CREATE INDEX IF NOT EXISTS "payments_customerId_idx" ON "payments"("customerId");

CREATE INDEX IF NOT EXISTS "notification_logs_customerId_idx" ON "notification_logs"("customerId");
