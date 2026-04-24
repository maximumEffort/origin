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
    const brands = [...new Set(STATIC_VEHICLES.map((v) => v.brand))];
    expect(brands).toContain('NIO');
    expect(brands).toContain('Voyah');
    expect(brands).toContain('Zeekr');
    expect(brands).toContain('BYD');
  });
});

describe('getStaticVehicle', () => {
  it('returns a vehicle by ID', () => {
    const v = getStaticVehicle('nio-es6');
    expect(v).toBeDefined();
    expect(v!.brand).toBe('NIO');
    expect(v!.model).toBe('ES6');
  });

  it('returns undefined for unknown ID', () => {
    expect(getStaticVehicle('nonexistent')).toBeUndefined();
  });
});
