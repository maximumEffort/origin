-- Fix bad seed data: "BYD WRX" is a Subaru model, not BYD.
-- See: https://github.com/maximumEffort/origin/issues/68
--
-- The vehicle was inserted with: brand=BYD, model=WRX, fuelType=PETROL.
-- BYD doesn't make a WRX, and a petrol vehicle doesn't belong on an
-- EV-positioned platform. Deleting the row.

-- Defensive: unlink any bookings referencing this vehicle.
-- (Should be none — this was bogus seed data, not a real fleet car.)
UPDATE bookings SET vehicle_id = NULL
WHERE vehicle_id IN (SELECT id FROM vehicles WHERE brand = 'BYD' AND model = 'WRX');

UPDATE bookings SET assigned_vehicle_id = NULL
WHERE assigned_vehicle_id IN (SELECT id FROM vehicles WHERE brand = 'BYD' AND model = 'WRX');

-- VehicleImage has onDelete: Cascade in the schema, so associated
-- images are removed automatically by the FK constraint.
DELETE FROM vehicles WHERE brand = 'BYD' AND model = 'WRX';
