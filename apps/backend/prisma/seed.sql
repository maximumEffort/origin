-- Origin Car Leasing - Database Seed (Corrected)
-- Run this in Supabase SQL editor to populate all tables with test data
-- All enum values and column names match the live Prisma schema
-- Idempotent: uses ON CONFLICT DO NOTHING

-- ────────────────────────────────────────────────
-- IMAGES
-- ────────────────────────────────────────────────
INSERT INTO vehicle_images (id, "vehicleId", url, "isPrimary", "sortOrder") VALUES
  (gen_random_uuid(), '2df77166-ceea-4ddb-94b6-31d9156d9392', 'https://images.originleasing.ae/byd-forrunner-front.jpg', true, 0),
  (gen_random_uuid(), '0b6f9c3e-277c-4370-9dc3-22dd2e4be6f2', 'https://images.originleasing.ae/byd-m235i-front.jpg', true, 0),
  (gen_random_uuid(), '7f8cba4e-0ac0-4b91-9f81-9eafb9cd37fb', 'https://images.originleasing.ae/byd-wrx-front.jpg', true, 0),
  (gen_random_uuid(), '4fbb36b1-8b1e-4c9e-8917-a070f790156a', 'https://images.originleasing.ae/nio-es6-front.jpg', true, 0),
  (gen_random_uuid(), 'd7f4b239-3b49-4813-ae80-9cbcece152a8', 'https://images.originleasing.ae/nio-es6-front.jpg', true, 0),
  (gen_random_uuid(), 'df8bd380-a4e3-4102-849d-f09d0c609348', 'https://images.originleasing.ae/nio-es7-front.jpg', true, 0),
  (gen_random_uuid(), 'ad4fb15a-58d2-4b60-9541-53a4cfd6c139', 'https://images.originleasing.ae/nio-es8-front.jpg', true, 0),
  (gen_random_uuid(), '96ed5e9e-14f1-4e80-a533-7f2167e3ae6f', 'https://images.originleasing.ae/nio-es8-front.jpg', true, 0),
  (gen_random_uuid(), 'f6a564c1-8e84-4d82-9ab9-4f8cca74a428', 'https://images.originleasing.ae/nio-et7-front.jpg', true, 0),
  (gen_random_uuid(), '7562faae-8e22-446a-a047-31db750a918b', 'https://images.originleasing.ae/voyah-dreamer-front.jpg', true, 0)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────
-- CUSTOMERS
-- ────────────────────────────────────────────────
INSERT INTO customers (id, phone, email, "fullName", nationality, "preferredLanguage", "kycStatus", "whatsappOptIn", "createdAt", "updatedAt") VALUES
  ('cust-001', '+971501234567', 'ahmed.maktoum@email.com', 'Ahmed Al Maktoum', 'AE', 'en', 'APPROVED', true, NOW(), NOW()),
  ('cust-002', '+971502345678', 'sarah.chen@email.com', 'Sarah Chen', 'CN', 'zh', 'APPROVED', true, NOW(), NOW()),
  ('cust-003', '+971503456789', 'mohammed.rashid@email.com', 'Mohammed Al Rashid', 'AE', 'ar', 'APPROVED', true, NOW(), NOW()),
  ('cust-004', '+971504567890', 'wei.zhang@email.com', 'Wei Zhang', 'CN', 'zh', 'SUBMITTED', false, NOW(), NOW()),
  ('cust-005', '+971505678901', 'fatima.hassan@email.com', 'Fatima Hassan', 'AE', 'en', 'APPROVED', true, NOW(), NOW()),
  ('cust-006', '+971506789012', 'li.wang@email.com', 'Li Wang', 'CN', 'en', 'APPROVED', true, NOW(), NOW()),
  ('cust-007', '+971507890123', 'omar.khalifa@email.com', 'Omar Khalifa', 'AE', 'ar', 'SUBMITTED', true, NOW(), NOW()),
  ('cust-008', '+971508901234', 'priya.patel@email.com', 'Priya Patel', 'IN', 'en', 'APPROVED', true, NOW(), NOW()),
  ('cust-009', '+971509012345', 'yusuf.hashimi@email.com', 'Yusuf Al Hashimi', 'AE', 'ar', 'APPROVED', true, NOW(), NOW()),
  ('cust-010', '+971500123456', 'xin.liu@email.com', 'Xin Liu', 'CN', 'zh', 'APPROVED', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- DOCUMENTS
-- ────────────────────────────────────────────────
INSERT INTO documents (id, "customerId", type, "fileUrl", "expiryDate", status, "rejectionReason", "uploadedAt", "reviewedAt", "reviewedBy") VALUES
  (gen_random_uuid(), 'cust-001', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-001/emirates_id.pdf', NOW() + INTERVAL '365 days', 'APPROVED', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-001', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-001/driving_licence.pdf', NOW() + INTERVAL '355 days', 'APPROVED', NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-001', 'VISA', 'https://storage.originleasing.ae/docs/cust-001/visa.pdf', NOW() + INTERVAL '345 days', 'APPROVED', NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-002', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-002/emirates_id.pdf', NOW() + INTERVAL '335 days', 'APPROVED', NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-002', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-002/driving_licence.pdf', NOW() + INTERVAL '325 days', 'APPROVED', NULL, NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-002', 'PASSPORT', 'https://storage.originleasing.ae/docs/cust-002/passport.pdf', NOW() + INTERVAL '315 days', 'APPROVED', NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-003', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-003/emirates_id.pdf', NOW() + INTERVAL '305 days', 'APPROVED', NULL, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-003', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-003/driving_licence.pdf', NOW() + INTERVAL '295 days', 'APPROVED', NULL, NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-004', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-004/emirates_id.pdf', NOW() + INTERVAL '285 days', 'PENDING', NULL, NOW() - INTERVAL '10 days', NULL, NULL),
  (gen_random_uuid(), 'cust-004', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-004/driving_licence.pdf', NOW() + INTERVAL '275 days', 'PENDING', NULL, NOW() - INTERVAL '11 days', NULL, NULL),
  (gen_random_uuid(), 'cust-005', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-005/emirates_id.pdf', NOW() + INTERVAL '265 days', 'APPROVED', NULL, NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-005', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-005/driving_licence.pdf', NOW() + INTERVAL '255 days', 'APPROVED', NULL, NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-005', 'VISA', 'https://storage.originleasing.ae/docs/cust-005/visa.pdf', NOW() + INTERVAL '245 days', 'APPROVED', NULL, NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-006', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-006/emirates_id.pdf', NOW() + INTERVAL '235 days', 'APPROVED', NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-006', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-006/driving_licence.pdf', NOW() + INTERVAL '225 days', 'APPROVED', NULL, NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-006', 'PASSPORT', 'https://storage.originleasing.ae/docs/cust-006/passport.pdf', NOW() + INTERVAL '215 days', 'APPROVED', NULL, NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-007', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-007/emirates_id.pdf', NOW() + INTERVAL '205 days', 'PENDING', NULL, NOW() - INTERVAL '18 days', NULL, NULL),
  (gen_random_uuid(), 'cust-008', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-008/emirates_id.pdf', NOW() + INTERVAL '195 days', 'APPROVED', NULL, NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-008', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-008/driving_licence.pdf', NOW() + INTERVAL '185 days', 'APPROVED', NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-009', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-009/emirates_id.pdf', NOW() + INTERVAL '175 days', 'APPROVED', NULL, NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-009', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-009/driving_licence.pdf', NOW() + INTERVAL '165 days', 'APPROVED', NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-009', 'VISA', 'https://storage.originleasing.ae/docs/cust-009/visa.pdf', NOW() + INTERVAL '155 days', 'APPROVED', NULL, NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-010', 'EMIRATES_ID', 'https://storage.originleasing.ae/docs/cust-010/emirates_id.pdf', NOW() + INTERVAL '145 days', 'APPROVED', NULL, NOW() - INTERVAL '24 days', NOW() - INTERVAL '23 days', '0197df71-2fa9-4c8b-953d-f22879b789bf'),
  (gen_random_uuid(), 'cust-010', 'DRIVING_LICENCE', 'https://storage.originleasing.ae/docs/cust-010/driving_licence.pdf', NOW() + INTERVAL '135 days', 'APPROVED', NULL, NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', '0197df71-2fa9-4c8b-953d-f22879b789bf')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────
-- BOOKINGS
-- ────────────────────────────────────────────────
INSERT INTO bookings (id, reference, "customerId", "vehicleId", "assignedVehicleId", "leaseType", "startDate", "endDate", "durationDays", "mileagePackage", "addOns", "quotedTotalAed", "vatAmountAed", "grandTotalAed", "depositAmountAed", "depositPaid", status, "rejectionReason", "pickupLocation", "dropoffLocation", notes, "createdAt", "updatedAt", "serviceType") VALUES
  ('book-001', 'ORG-2025-001', 'cust-001', '4fbb36b1-8b1e-4c9e-8917-a070f790156a', '4fbb36b1-8b1e-4c9e-8917-a070f790156a', 'LONG_TERM', '2025-01-15', '2026-01-14', 365, 3000, '[]', 39600.0, 1980.0, 41580.0, 5000.0, true, 'CONVERTED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-002', 'ORG-2025-002', 'cust-002', '7562faae-8e22-446a-a047-31db750a918b', '7562faae-8e22-446a-a047-31db750a918b', 'LONG_TERM', '2025-02-01', '2025-07-31', 181, 3000, '[]', 34320.0, 1716.0, 36036.0, 5000.0, true, 'CONVERTED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-003', 'ORG-2025-003', 'cust-003', 'df8bd380-a4e3-4102-849d-f09d0c609348', 'df8bd380-a4e3-4102-849d-f09d0c609348', 'SHORT_TERM', '2025-03-01', '2025-05-31', 92, 3000, '[]', 8910.0, 445.5, 9355.5, 3000.0, true, 'APPROVED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-004', 'ORG-2025-004', 'cust-005', 'f6a564c1-8e84-4d82-9ab9-4f8cca74a428', 'f6a564c1-8e84-4d82-9ab9-4f8cca74a428', 'LONG_TERM', '2025-01-20', '2027-01-19', 730, 4000, '[]', 147840.0, 7392.0, 155232.0, 8000.0, true, 'CONVERTED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-005', 'ORG-2025-005', 'cust-006', '2df77166-ceea-4ddb-94b6-31d9156d9392', NULL, 'LONG_TERM', '2025-04-01', '2026-03-31', 365, 3000, '[]', 39600.0, 1980.0, 41580.0, 5000.0, false, 'SUBMITTED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-006', 'ORG-2025-006', 'cust-008', 'd7f4b239-3b49-4813-ae80-9cbcece152a8', 'd7f4b239-3b49-4813-ae80-9cbcece152a8', 'LONG_TERM', '2025-02-10', '2026-02-09', 365, 3000, '[]', 66000.0, 3300.0, 69300.0, 7000.0, true, 'CONVERTED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-007', 'ORG-2025-007', 'cust-009', 'ad4fb15a-58d2-4b60-9541-53a4cfd6c139', NULL, 'LONG_TERM', '2025-03-15', '2025-09-14', 183, 4000, '[]', 39600.0, 1980.0, 41580.0, 5000.0, false, 'REJECTED', 'Vehicle unavailable for requested dates', 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-008', 'ORG-2025-008', 'cust-010', '96ed5e9e-14f1-4e80-a533-7f2167e3ae6f', NULL, 'SHORT_TERM', '2025-04-10', '2025-04-20', 10, 1000, '[]', 3000.0, 150.0, 3150.0, 1500.0, false, 'DRAFT', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'RENT'),
  ('book-009', 'ORG-2025-009', 'cust-004', '0b6f9c3e-277c-4370-9dc3-22dd2e4be6f2', NULL, 'LONG_TERM', '2025-03-01', '2026-02-28', 365, 3000, '[]', 50160.0, 2508.0, 52668.0, 5000.0, false, 'CANCELLED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE'),
  ('book-010', 'ORG-2025-010', 'cust-001', '7f8cba4e-0ac0-4b91-9f81-9eafb9cd37fb', NULL, 'LONG_TERM', '2025-04-15', '2025-10-14', 183, 3000, '[]', 13200.0, 660.0, 13860.0, 3000.0, false, 'SUBMITTED', NULL, 'Origin Office, Creek Harbour', 'Origin Office, Creek Harbour', NULL, NOW(), NOW(), 'LEASE')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- LEASES
-- ────────────────────────────────────────────────
INSERT INTO leases (id, reference, "bookingId", "customerId", "vehicleId", "startDate", "endDate", "monthlyRateAed", "vatRate", "mileageLimitMonthly", status, "renewalOfId", "agreementPdfUrl", notes, "createdAt", "updatedAt", "downPaymentAed", "serviceType") VALUES
  ('lease-001', 'LSE-2025-001', 'book-001', 'cust-001', '4fbb36b1-8b1e-4c9e-8917-a070f790156a', '2025-01-20', '2026-01-19', 3300.0, 0.05, 3000, 'ACTIVE', NULL, NULL, NULL, NOW(), NOW(), 5000.0, 'LEASE'),
  ('lease-002', 'LSE-2025-002', 'book-002', 'cust-002', '7562faae-8e22-446a-a047-31db750a918b', '2025-02-05', '2025-08-04', 5720.0, 0.05, 3000, 'ACTIVE', NULL, NULL, NULL, NOW(), NOW(), 5000.0, 'LEASE'),
  ('lease-003', 'LSE-2025-003', 'book-004', 'cust-005', 'f6a564c1-8e84-4d82-9ab9-4f8cca74a428', '2025-01-25', '2027-01-24', 6160.0, 0.05, 4000, 'ACTIVE', NULL, NULL, NULL, NOW(), NOW(), 8000.0, 'LEASE'),
  ('lease-004', 'LSE-2025-004', 'book-006', 'cust-008', 'd7f4b239-3b49-4813-ae80-9cbcece152a8', '2025-02-15', '2026-02-14', 5500.0, 0.05, 3000, 'ACTIVE', NULL, NULL, NULL, NOW(), NOW(), 7000.0, 'LEASE')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- PAYMENTS
-- ────────────────────────────────────────────────
INSERT INTO payments (id, "leaseId", "customerId", type, "amountAed", "vatAmountAed", "totalAed", "dueDate", "paidAt", status, "paymentMethod", gateway, "gatewayReference", "invoicePdfUrl", "createdAt") VALUES
  ('pay-001', 'lease-001', 'cust-001', 'MONTHLY', 3300.0, 165.0, 3465.0, '2025-01-20', '2025-01-20', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay001', NULL, NOW()),
  ('pay-002', 'lease-001', 'cust-001', 'MONTHLY', 3300.0, 165.0, 3465.0, '2025-02-20', '2025-02-20', 'PAID', 'BANK_TRANSFER', 'CHECKOUT_COM', 'txn_pay002', NULL, NOW()),
  ('pay-003', 'lease-001', 'cust-001', 'MONTHLY', 3300.0, 165.0, 3465.0, '2025-03-20', '2025-03-20', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay003', NULL, NOW()),
  ('pay-004', 'lease-001', 'cust-001', 'MONTHLY', 3300.0, 165.0, 3465.0, '2025-04-20', NULL, 'PENDING', 'BANK_TRANSFER', 'CHECKOUT_COM', NULL, NULL, NOW()),
  ('pay-005', 'lease-002', 'cust-002', 'MONTHLY', 5720.0, 286.0, 6006.0, '2025-02-05', '2025-02-05', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay005', NULL, NOW()),
  ('pay-006', 'lease-002', 'cust-002', 'MONTHLY', 5720.0, 286.0, 6006.0, '2025-03-05', '2025-03-05', 'PAID', 'BANK_TRANSFER', 'CHECKOUT_COM', 'txn_pay006', NULL, NOW()),
  ('pay-007', 'lease-002', 'cust-002', 'MONTHLY', 5720.0, 286.0, 6006.0, '2025-04-05', '2025-04-05', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay007', NULL, NOW()),
  ('pay-008', 'lease-002', 'cust-002', 'MONTHLY', 5720.0, 286.0, 6006.0, '2025-05-05', NULL, 'PENDING', 'BANK_TRANSFER', 'CHECKOUT_COM', NULL, NULL, NOW()),
  ('pay-009', 'lease-003', 'cust-005', 'MONTHLY', 6160.0, 308.0, 6468.0, '2025-01-25', '2025-01-25', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay009', NULL, NOW()),
  ('pay-010', 'lease-003', 'cust-005', 'MONTHLY', 6160.0, 308.0, 6468.0, '2025-02-25', '2025-02-25', 'PAID', 'BANK_TRANSFER', 'CHECKOUT_COM', 'txn_pay010', NULL, NOW()),
  ('pay-011', 'lease-003', 'cust-005', 'MONTHLY', 6160.0, 308.0, 6468.0, '2025-03-25', '2025-03-25', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay011', NULL, NOW()),
  ('pay-012', 'lease-003', 'cust-005', 'MONTHLY', 6160.0, 308.0, 6468.0, '2025-04-25', NULL, 'PENDING', 'BANK_TRANSFER', 'CHECKOUT_COM', NULL, NULL, NOW()),
  ('pay-013', 'lease-004', 'cust-008', 'MONTHLY', 5500.0, 275.0, 5775.0, '2025-02-15', '2025-02-15', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay013', NULL, NOW()),
  ('pay-014', 'lease-004', 'cust-008', 'MONTHLY', 5500.0, 275.0, 5775.0, '2025-03-15', '2025-03-15', 'PAID', 'BANK_TRANSFER', 'CHECKOUT_COM', 'txn_pay014', NULL, NOW()),
  ('pay-015', 'lease-004', 'cust-008', 'MONTHLY', 5500.0, 275.0, 5775.0, '2025-04-15', '2025-04-15', 'PAID', 'CARD', 'CHECKOUT_COM', 'txn_pay015', NULL, NOW()),
  ('pay-016', 'lease-004', 'cust-008', 'MONTHLY', 5500.0, 275.0, 5775.0, '2025-05-15', NULL, 'PENDING', 'BANK_TRANSFER', 'CHECKOUT_COM', NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────
INSERT INTO notification_logs (id, "customerId", channel, template, language, "contentSnapshot", status, "sentAt", metadata) VALUES
  (gen_random_uuid(), 'cust-001', 'EMAIL', 'booking_confirmed', 'en', 'Your booking ORG-2025-001 has been confirmed.', 'DELIVERED', NOW() - INTERVAL '1 days', NULL),
  (gen_random_uuid(), 'cust-001', 'WHATSAPP', 'lease_started', 'en', 'Your lease LSE-2025-001 is now active. Enjoy your NIO ES6!', 'DELIVERED', NOW() - INTERVAL '2 days', NULL),
  (gen_random_uuid(), 'cust-001', 'EMAIL', 'payment_received', 'en', 'We received your payment of AED 3,300. Thank you!', 'DELIVERED', NOW() - INTERVAL '3 days', NULL),
  (gen_random_uuid(), 'cust-002', 'EMAIL', 'booking_confirmed', 'zh', 'Your booking ORG-2025-002 has been confirmed.', 'DELIVERED', NOW() - INTERVAL '4 days', NULL),
  (gen_random_uuid(), 'cust-002', 'WHATSAPP', 'lease_started', 'zh', 'Your lease LSE-2025-002 is now active.', 'DELIVERED', NOW() - INTERVAL '5 days', NULL),
  (gen_random_uuid(), 'cust-005', 'EMAIL', 'booking_confirmed', 'en', 'Your booking ORG-2025-004 has been confirmed.', 'SENT', NOW() - INTERVAL '6 days', NULL),
  (gen_random_uuid(), 'cust-005', 'SMS', 'payment_due', 'en', 'Reminder: Your lease payment of AED 6,160 is due in 3 days.', 'SENT', NOW() - INTERVAL '7 days', NULL),
  (gen_random_uuid(), 'cust-008', 'EMAIL', 'booking_confirmed', 'en', 'Your booking ORG-2025-006 has been confirmed.', 'DELIVERED', NOW() - INTERVAL '8 days', NULL),
  (gen_random_uuid(), 'cust-004', 'EMAIL', 'document_required', 'zh', 'Please upload your driving licence to complete your application.', 'SENT', NOW() - INTERVAL '9 days', NULL),
  (gen_random_uuid(), 'cust-007', 'WHATSAPP', 'document_required', 'ar', 'Your KYC documents are incomplete.', 'FAILED', NOW() - INTERVAL '10 days', NULL),
  (gen_random_uuid(), 'cust-009', 'EMAIL', 'booking_rejected', 'ar', 'Your booking could not be approved at this time.', 'DELIVERED', NOW() - INTERVAL '11 days', NULL),
  (gen_random_uuid(), 'cust-006', 'EMAIL', 'booking_submitted', 'en', 'We received your booking request.', 'DELIVERED', NOW() - INTERVAL '12 days', NULL)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────
-- CONTACTS
-- ────────────────────────────────────────────────
INSERT INTO contact_inquiries (id, name, email, phone, subject, message, "createdAt") VALUES
  (gen_random_uuid(), 'Rashid Al Mansoori', 'rashid@email.com', '+971551234567', 'Leasing Inquiry', 'Interested in leasing a NIO ES6 for 12 months.', NOW() - INTERVAL '1 days'),
  (gen_random_uuid(), 'Chen Wei Ming', 'chen.wm@email.com', '+971552345678', 'Corporate Fleet', 'Do you offer corporate fleet leasing? We need 5 vehicles.', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'Aisha Bint Khalid', 'aisha.k@email.com', '+971553456789', 'Insurance Options', 'What insurance options are included with the lease?', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'John Smith', 'john.smith@email.com', '+971554567890', 'International Licence', 'I have an international driving licence. Can I lease?', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'Zhang Mei', 'zhang.mei@email.com', '+971555678901', 'BYD Availability', 'Are there any BYD models available for short-term rental?', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'Khalid Mohammed', 'khalid.m@email.com', '+971556789012', 'Early Termination', 'What are the penalties for early lease termination?', NOW() - INTERVAL '6 days')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────
-- ADMINS
-- ────────────────────────────────────────────────
INSERT INTO admin_users (id, email, password, "fullName", role, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'fleet@originleasing.ae', '$2b$10$Kv7hGpZr9e4Dn5JYB8sY2eXcfA5LgVm7kqD3rN1bP0wMxS4tU6vYe', 'Bella Ma', 'FLEET_MANAGER', true, NOW(), NOW()),
  (gen_random_uuid(), 'sales@originleasing.ae', '$2b$10$Kv7hGpZr9e4Dn5JYB8sY2eXcfA5LgVm7kqD3rN1bP0wMxS4tU6vYe', 'Ahmad Sales', 'SALES', true, NOW(), NOW()),
  (gen_random_uuid(), 'finance@originleasing.ae', '$2b$10$Kv7hGpZr9e4Dn5JYB8sY2eXcfA5LgVm7kqD3rN1bP0wMxS4tU6vYe', 'Fatima Finance', 'FINANCE', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

