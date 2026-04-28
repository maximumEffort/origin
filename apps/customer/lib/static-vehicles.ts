/**
 * Static vehicle data — Origin Car Leasing fleet.
 * Source: company inventory (Shanghai Car Rental LLC, April 2026).
 *
 * V1 is rental-only. Pricing is AED inclusive of 5% VAT.
 * - monthlyAed / dailyAed: rental rates from the active fleet sheet
 * - mileageLimit: monthly km included; excess at AED 1/km
 * - One entry per vehicle in the fleet (single unit each, stock=1)
 *
 * This file is kept in sync with apps/backend/seed_fleet.py and serves as
 * the SSR/fallback source when the backend API is unreachable. When the
 * backend returns vehicles, CarsGrid silently upgrades to live data.
 */

export interface StaticVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  fuel: string;
  transmission: string;
  seats: number;
  colour: string;
  /** Rental rate per month (short-term, with km limit) */
  monthlyAed: number;
  dailyAed: number;
  mileageLimit: number;
  imageUrl: string;
  available: boolean;
  features: string[];
  /** Refundable security deposit, AED */
  depositAed?: number;
  /** Vehicle selling price (AED) — V2+ when buy/lease licences land */
  priceAed?: number;
  /** Down payment for leasing (V3+) */
  downPaymentAed?: number;
  /** Lease-to-own monthly instalment (V3+) */
  leaseMonthlyAed?: number;
  /** Number of units in stock */
  stock?: number;
  /** Available colour options */
  colours?: string[];
}

/**
 * Generate a branded placeholder image URL for vehicles without photos.
 * Uses placehold.co which is a reliable, free placeholder service.
 */
function placeholder(brand: string, model: string): string {
  const text = encodeURIComponent(`${brand} ${model}`);
  return `https://placehold.co/800x500/163478/ffffff?text=${text}&font=inter`;
}

export const STATIC_VEHICLES: StaticVehicle[] = [
  // ── Sedans ───────────────────────────────────────────────────────
  {
    id: 'dongfeng-shine-e1', brand: 'Dongfeng', model: 'Shine E1', year: 2025,
    category: 'Sedan', fuel: 'petrol', transmission: 'Automatic',
    seats: 5, colour: 'Pearl White',
    monthlyAed: 1400, dailyAed: 100, mileageLimit: 9000,
    available: true, depositAed: 1500, stock: 1, colours: ['Pearl White'],
    imageUrl: placeholder('Dongfeng', 'Shine E1'),
    features: ['Compact sedan', 'Apple CarPlay & Android Auto', 'Reverse camera', 'Cruise control', '5-seater', 'Petrol — efficient daily driver'],
  },
  {
    id: 'bestune-b70s', brand: 'Bestune', model: 'B70S', year: 2023,
    category: 'Sedan', fuel: 'petrol', transmission: 'Automatic',
    seats: 5, colour: 'Titanium Grey',
    monthlyAed: 1500, dailyAed: 110, mileageLimit: 9000,
    available: true, depositAed: 1500, stock: 1, colours: ['Titanium Grey'],
    imageUrl: placeholder('Bestune', 'B70S'),
    features: ['Sporty fastback styling', '12.3" infotainment', '360° camera', 'Lane-keep assist', 'Sunroof', 'Premium audio'],
  },
  {
    id: 'hongqi-h5', brand: 'Hongqi', model: 'H5', year: 2023,
    category: 'Sedan', fuel: 'petrol', transmission: 'Automatic',
    seats: 5, colour: 'Obsidian Black',
    monthlyAed: 1700, dailyAed: 130, mileageLimit: 9000,
    available: true, depositAed: 1500, stock: 1, colours: ['Obsidian Black'],
    imageUrl: placeholder('Hongqi', 'H5'),
    features: ['Mid-size executive sedan', 'Leather interior', 'Heated seats', 'Adaptive cruise control', 'Premium sound system', 'Panoramic roof'],
  },
  {
    id: 'hongqi-h9', brand: 'Hongqi', model: 'H9', year: 2023,
    category: 'Sedan', fuel: 'petrol', transmission: 'Automatic',
    seats: 5, colour: 'Imperial Red',
    monthlyAed: 4500, dailyAed: 380, mileageLimit: 5000,
    available: true, depositAed: 2500, stock: 1, colours: ['Imperial Red'],
    imageUrl: placeholder('Hongqi', 'H9'),
    features: ['Full-size luxury flagship', 'Massaging Nappa leather seats', 'Rear executive recline', 'Refrigerated centre console', 'Ambient lighting', 'Premium 17-speaker audio'],
  },
  {
    id: 'zeekr-001', brand: 'Zeekr', model: '001', year: 2025,
    category: 'Electric Sedan', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'Cosmos Blue',
    monthlyAed: 5200, dailyAed: 380, mileageLimit: 5000,
    available: true, depositAed: 2500, stock: 1, colours: ['Cosmos Blue'],
    imageUrl: placeholder('Zeekr', '001'),
    features: ['Premium electric shooting brake', '100 kWh battery', '~700 km range (CLTC)', 'Air suspension', 'Dual-motor AWD', 'Yamaha 16-speaker audio', 'Level 2+ ADAS'],
  },

  // ── SUVs ────────────────────────────────────────────────────────
  {
    id: 'great-wall-jolion', brand: 'Great Wall', model: 'Jolion', year: 2023,
    category: 'SUV', fuel: 'petrol', transmission: 'Automatic',
    seats: 5, colour: 'Desert Sand',
    monthlyAed: 1900, dailyAed: 120, mileageLimit: 9000,
    available: true, depositAed: 1500, stock: 1, colours: ['Desert Sand'],
    imageUrl: placeholder('Great Wall', 'Jolion'),
    features: ['Compact crossover SUV', '10.25" touchscreen', 'Wireless phone charging', 'Lane departure warning', 'Hill-start assist', 'LED headlights'],
  },
  {
    id: 'hongqi-hs5', brand: 'Hongqi', model: 'HS5', year: 2022,
    category: 'SUV', fuel: 'petrol', transmission: 'Automatic',
    seats: 5, colour: 'Glacier White',
    monthlyAed: 2200, dailyAed: 150, mileageLimit: 9000,
    available: true, depositAed: 1500, stock: 1, colours: ['Glacier White'],
    imageUrl: placeholder('Hongqi', 'HS5'),
    features: ['Mid-size luxury SUV', 'Leather interior', 'Panoramic sunroof', 'Powered tailgate', '360° camera', 'Heated and ventilated seats'],
  },
  {
    id: 'forting-t5-evo', brand: 'Forting', model: 'T5 EVO', year: 2024,
    category: 'SUV', fuel: 'petrol', transmission: 'Automatic',
    seats: 5, colour: 'Midnight Blue',
    monthlyAed: 2500, dailyAed: 150, mileageLimit: 9000,
    available: true, depositAed: 1500, stock: 1, colours: ['Midnight Blue'],
    imageUrl: placeholder('Forting', 'T5 EVO'),
    features: ['Stylish mid-size SUV', 'Twin 12.3" displays', 'Wireless CarPlay', 'Active safety suite', 'Sport-tuned suspension', 'Panoramic roof'],
  },
  {
    id: 'zeekr-x', brand: 'Zeekr', model: 'X', year: 2025,
    category: 'Electric SUV', fuel: 'electric', transmission: 'Automatic',
    seats: 5, colour: 'Aurora Green',
    monthlyAed: 2400, dailyAed: 180, mileageLimit: 5000,
    available: true, depositAed: 2000, stock: 1, colours: ['Aurora Green'],
    imageUrl: placeholder('Zeekr', 'X'),
    features: ['Compact electric crossover', 'SEA platform (Geely)', '66 kWh battery', '~560 km range (CLTC)', '14.6" AMOLED display', 'Yamaha premium audio', 'Vehicle-to-load (V2L)'],
  },
  {
    id: 'forting-u-tour-m4', brand: 'Forting', model: 'U-Tour M4', year: 2024,
    category: 'SUV', fuel: 'petrol', transmission: 'Automatic',
    seats: 7, colour: 'Silver Metallic',
    monthlyAed: 2600, dailyAed: 180, mileageLimit: 9000,
    available: true, depositAed: 2000, stock: 1, colours: ['Silver Metallic'],
    imageUrl: placeholder('Forting', 'U-Tour M4'),
    features: ['7-seat family SUV', 'Three-row seating', 'Captain second-row chairs', 'Tri-zone climate control', '360° camera', 'Rear-seat entertainment ports'],
  },

  // ── MPV ──────────────────────────────────────────────────────
  {
    id: 'wey-gaoshan', brand: 'WEY', model: 'Gaoshan', year: 2023,
    category: 'MPV', fuel: 'hybrid', transmission: 'Automatic',
    seats: 7, colour: 'Champagne Gold',
    monthlyAed: 5800, dailyAed: 400, mileageLimit: 5000,
    available: true, depositAed: 2500, stock: 1, colours: ['Champagne Gold'],
    imageUrl: placeholder('WEY', 'Gaoshan'),
    features: ['Premium 7-seat hybrid MPV', 'Plug-in hybrid powertrain', 'Second-row captain chairs with massage', 'Refrigerator console', 'Rear entertainment screens', 'Tri-zone climate control', 'Quad-motor AWD'],
  },
];

/** Lookup a single vehicle by ID from static data */
export function getStaticVehicle(id: string): StaticVehicle | undefined {
  return STATIC_VEHICLES.find((v) => v.id === id);
}
