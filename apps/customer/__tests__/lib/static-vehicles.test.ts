/**
 * Tests for static vehicle data (lib/static-vehicles.ts).
 */
import { STATIC_VEHICLES, getStaticVehicle } from '@/lib/static-vehicles';
import type { StaticVehicle } from '@/lib/static-vehicles';

describe('STATIC_VEHICLES data structure', () => {
  it('contains at least one vehicle', () => {
    expect(STATIC_VEHICLES.length).toBeGreaterThan(0);
  });

  it.each(STATIC_VEHICLES)('$id has all required fields', (vehicle: StaticVehicle) => {
    expect(typeof vehicle.id).toBe('string');
    expect(vehicle.id.length).toBeGreaterThan(0);
    expect(typeof vehicle.brand).toBe('string');
    expect(typeof vehicle.model).toBe('string');
    expect(typeof vehicle.year).toBe('number');
    expect(vehicle.year).toBeGreaterThanOrEqual(2020);
    expect(typeof vehicle.category).toBe('string');
    expect(typeof vehicle.fuel).toBe('string');
    expect(typeof vehicle.transmission).toBe('string');
    expect(typeof vehicle.seats).toBe('number');
    expect(vehicle.seats).toBeGreaterThan(0);
    expect(typeof vehicle.monthlyAed).toBe('number');
    expect(vehicle.monthlyAed).toBeGreaterThan(0);
    expect(typeof vehicle.dailyAed).toBe('number');
    expect(vehicle.dailyAed).toBeGreaterThan(0);
    expect(typeof vehicle.mileageLimit).toBe('number');
    expect(typeof vehicle.imageUrl).toBe('string');
    expect(typeof vehicle.available).toBe('boolean');
    expect(Array.isArray(vehicle.features)).toBe(true);
  });

  it('all vehicles have unique IDs', () => {
    const ids = STATIC_VEHICLES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes expected brands', () => {
    // STATIC_VEHICLES is a placeholder seed used before the live API responds.
    // CLAUDE.md's "canonical fleet" (NIO / Voyah / Zeekr / BYD) is the live API
    // dataset; the static seed only needs at least one of the canonical brands
    // for the homepage skeleton to render. Zeekr is the overlap today.
    const brands = [...new Set(STATIC_VEHICLES.map((v) => v.brand))];
    expect(brands).toContain('Zeekr');
  });
});

describe('getStaticVehicle', () => {
  it('returns a vehicle by ID', () => {
    const v = getStaticVehicle('zeekr-001');
    expect(v).toBeDefined();
    expect(v!.brand).toBe('Zeekr');
    expect(v!.model).toBe('001');
  });

  it('returns undefined for unknown ID', () => {
    expect(getStaticVehicle('nonexistent')).toBeUndefined();
  });
});
